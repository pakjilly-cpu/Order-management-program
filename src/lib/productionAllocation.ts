import type { Order, Vendor, ProductionScheduleInsert } from '@/types/database';

interface LineSchedule {
  vendorId: string;
  lineNumber: number;
  date: Date;
  allocatedQuantity: number;
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getNextWorkingDay(date: Date, daysToAdd: number = 1): Date {
  let result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < daysToAdd) {
    result = addDays(result, 1);
    if (!isWeekend(result)) {
      addedDays++;
    }
  }
  
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

function getAvailableCapacity(
  vendor: Vendor,
  date: Date,
  schedules: LineSchedule[]
): { lineNumber: number; available: number }[] {
  const result: { lineNumber: number; available: number }[] = [];
  
  for (let line = 1; line <= vendor.line_count; line++) {
    const allocated = schedules
      .filter(s => 
        s.vendorId === vendor.id &&
        s.lineNumber === line &&
        s.date.getTime() === date.getTime()
      )
      .reduce((sum, s) => sum + s.allocatedQuantity, 0);
    
    const available = vendor.daily_capacity - allocated;
    if (available > 0) {
      result.push({ lineNumber: line, available });
    }
  }
  
  return result;
}

function getWorkingDaysBetween(startDate: Date, endDate: Date): Date[] {
  const days: Date[] = [];
  let current = new Date(startDate);
  
  while (current <= endDate) {
    if (!isWeekend(current)) {
      days.push(new Date(current));
    }
    current = addDays(current, 1);
  }
  
  return days;
}

export interface AllocationResult {
  schedule: ProductionScheduleInsert;
  success: boolean;
  message?: string;
}

export function allocateProductionSchedule(
  order: Order,
  vendor: Vendor,
  existingSchedules: LineSchedule[] = []
): AllocationResult {
  const orderDate = parseDate(order.order_date);
  const deliveryDate = order.delivery_date ? parseDate(order.delivery_date) : null;
  
  const transferDate = getNextWorkingDay(orderDate, 1);
  const earliestProductionDate = getNextWorkingDay(transferDate, 1);
  
  let deadline: Date;
  if (deliveryDate) {
    deadline = deliveryDate;
  } else {
    deadline = addDays(earliestProductionDate, 30);
  }
  
  const workingDays = getWorkingDaysBetween(earliestProductionDate, deadline);
  
  if (workingDays.length === 0) {
    return {
      schedule: createSchedule(order, vendor, earliestProductionDate, earliestProductionDate, transferDate, earliestProductionDate),
      success: false,
      message: '생산 가능한 근무일이 없습니다.'
    };
  }
  
  const schedules = [...existingSchedules];
  let remainingQuantity = order.quantity;
  let currentDayIndex = 0;
  let planStartDate: Date | null = null;
  let planEndDate: Date = workingDays[0];
  
  while (remainingQuantity > 0 && currentDayIndex < workingDays.length) {
    const currentDate = workingDays[currentDayIndex];
    const availableLines = getAvailableCapacity(vendor, currentDate, schedules);
    
    if (availableLines.length === 0) {
      currentDayIndex++;
      continue;
    }
    
    for (const line of availableLines) {
      if (remainingQuantity <= 0) break;
      
      const allocateQty = Math.min(remainingQuantity, line.available);
      
      schedules.push({
        vendorId: vendor.id,
        lineNumber: line.lineNumber,
        date: currentDate,
        allocatedQuantity: allocateQty,
      });
      
      if (!planStartDate) {
        planStartDate = currentDate;
      }
      
      remainingQuantity -= allocateQty;
      planEndDate = currentDate;
    }
    
    currentDayIndex++;
  }
  
  if (!planStartDate) {
    planStartDate = earliestProductionDate;
  }
  
  const success = remainingQuantity === 0;
  
  return {
    schedule: createSchedule(order, vendor, planStartDate, planEndDate, transferDate, earliestProductionDate),
    success,
    message: success ? undefined : `CAPA 부족: ${remainingQuantity}개 미배정`
  };
}

function createSchedule(
  order: Order,
  vendor: Vendor,
  startDate: Date,
  endDate: Date,
  transferDate: Date,
  earliestProductionDate: Date
): ProductionScheduleInsert {
  return {
    order_id: order.id,
    vendor_id: vendor.id,
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
    transfer_date: formatDate(transferDate),
    earliest_production_date: formatDate(earliestProductionDate),
    status: 'planned',
    is_manually_adjusted: false,
    notes: null,
  };
}

export function allocateMultipleOrders(
  orders: Order[],
  vendors: Map<string, Vendor>
): AllocationResult[] {
  const results: AllocationResult[] = [];
  const allSchedules: LineSchedule[] = [];
  
  const sortedOrders = [...orders].sort((a, b) => {
    if (a.delivery_date && b.delivery_date) {
      return a.delivery_date.localeCompare(b.delivery_date);
    }
    if (a.delivery_date) return -1;
    if (b.delivery_date) return 1;
    return a.order_date.localeCompare(b.order_date);
  });
  
  for (const order of sortedOrders) {
    const vendor = vendors.get(order.vendor_id);
    
    if (!vendor) {
      results.push({
        schedule: {
          order_id: order.id,
          vendor_id: order.vendor_id,
          start_date: order.order_date,
          end_date: order.order_date,
          transfer_date: null,
          earliest_production_date: null,
          status: 'planned',
          is_manually_adjusted: false,
          notes: '외주처 정보 없음',
        },
        success: false,
        message: '외주처 정보를 찾을 수 없습니다.'
      });
      continue;
    }
    
    const result = allocateProductionSchedule(order, vendor, allSchedules);
    results.push(result);
    
    if (result.success) {
      const startDate = parseDate(result.schedule.start_date);
      const endDate = parseDate(result.schedule.end_date);
      const days = getWorkingDaysBetween(startDate, endDate);
      const dailyQty = Math.ceil(order.quantity / days.length);
      
      for (const day of days) {
        for (let line = 1; line <= vendor.line_count; line++) {
          const remaining = order.quantity - (days.indexOf(day) * dailyQty);
          const allocate = Math.min(dailyQty, remaining, vendor.daily_capacity);
          if (allocate > 0) {
            allSchedules.push({
              vendorId: vendor.id,
              lineNumber: line,
              date: day,
              allocatedQuantity: allocate,
            });
            break;
          }
        }
      }
    }
  }
  
  return results;
}
