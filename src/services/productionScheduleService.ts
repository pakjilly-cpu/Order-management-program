import { supabase } from '@/lib/supabase';
import type { 
  ProductionSchedule, 
  ProductionScheduleInsert, 
  ProductionScheduleUpdate,
  ProductionScheduleWithDetails,
  Order,
  Vendor
} from '@/types/database';
import { allocateProductionSchedule, allocateMultipleOrders } from '@/lib/productionAllocation';

export const getProductionSchedules = async (
  vendorId?: string
): Promise<{ data: ProductionScheduleWithDetails[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('production_schedules')
      .select(`
        *,
        order:orders(product_name, product_code, quantity, delivery_date, order_date),
        vendor:vendors(name, code, daily_capacity, line_count)
      `)
      .order('start_date', { ascending: true });

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: data as ProductionScheduleWithDetails[], error: null };
  } catch (error) {
    console.error('Error fetching production schedules:', error);
    return { data: null, error: error as Error };
  }
};

export const getSchedulesByDateRange = async (
  startDate: string,
  endDate: string,
  vendorId?: string
): Promise<{ data: ProductionScheduleWithDetails[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('production_schedules')
      .select(`
        *,
        order:orders(product_name, product_code, quantity, delivery_date, order_date),
        vendor:vendors(name, code, daily_capacity, line_count)
      `)
      .gte('start_date', startDate)
      .lte('end_date', endDate)
      .order('start_date', { ascending: true });

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: data as ProductionScheduleWithDetails[], error: null };
  } catch (error) {
    console.error('Error fetching schedules by date range:', error);
    return { data: null, error: error as Error };
  }
};

export const createProductionSchedule = async (
  schedule: ProductionScheduleInsert
): Promise<{ data: ProductionSchedule | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('production_schedules')
      .insert(schedule)
      .select()
      .single();

    if (error) throw error;
    return { data: data as ProductionSchedule, error: null };
  } catch (error) {
    console.error('Error creating production schedule:', error);
    return { data: null, error: error as Error };
  }
};

export const createProductionSchedules = async (
  schedules: ProductionScheduleInsert[]
): Promise<{ data: ProductionSchedule[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('production_schedules')
      .insert(schedules)
      .select();

    if (error) throw error;
    return { data: data as ProductionSchedule[], error: null };
  } catch (error) {
    console.error('Error creating production schedules:', error);
    return { data: null, error: error as Error };
  }
};

export const updateProductionSchedule = async (
  id: string,
  updateData: ProductionScheduleUpdate
): Promise<{ data: ProductionSchedule | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('production_schedules')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as ProductionSchedule, error: null };
  } catch (error) {
    console.error('Error updating production schedule:', error);
    return { data: null, error: error as Error };
  }
};

export const updateScheduleDates = async (
  id: string,
  startDate: string,
  endDate: string
): Promise<{ data: ProductionSchedule | null; error: Error | null }> => {
  return updateProductionSchedule(id, {
    start_date: startDate,
    end_date: endDate,
    is_manually_adjusted: true,
  });
};

export const deleteProductionSchedule = async (
  id: string
): Promise<{ data: null; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('production_schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data: null, error: null };
  } catch (error) {
    console.error('Error deleting production schedule:', error);
    return { data: null, error: error as Error };
  }
};

export const deleteSchedulesByOrderIds = async (
  orderIds: string[]
): Promise<{ data: null; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('production_schedules')
      .delete()
      .in('order_id', orderIds);

    if (error) throw error;
    return { data: null, error: null };
  } catch (error) {
    console.error('Error deleting production schedules:', error);
    return { data: null, error: error as Error };
  }
};

export const generateSchedulesForOrders = async (
  orders: Order[],
  vendors: Vendor[]
): Promise<{ data: ProductionSchedule[] | null; error: Error | null; warnings: string[] }> => {
  const warnings: string[] = [];
  
  const vendorMap = new Map<string, Vendor>();
  vendors.forEach(v => vendorMap.set(v.id, v));
  
  const results = allocateMultipleOrders(orders, vendorMap);
  
  const successfulSchedules: ProductionScheduleInsert[] = [];
  
  results.forEach((result, index) => {
    if (result.success) {
      successfulSchedules.push(result.schedule);
    } else {
      const order = orders[index];
      warnings.push(`${order.product_name}: ${result.message}`);
      successfulSchedules.push(result.schedule);
    }
  });
  
  if (successfulSchedules.length === 0) {
    return { data: [], error: null, warnings };
  }
  
  const { data, error } = await createProductionSchedules(successfulSchedules);
  
  return { data, error, warnings };
};

export const regenerateScheduleForOrder = async (
  order: Order,
  vendor: Vendor
): Promise<{ data: ProductionSchedule | null; error: Error | null; warning?: string }> => {
  await deleteSchedulesByOrderIds([order.id]);
  
  const result = allocateProductionSchedule(order, vendor);
  
  const { data, error } = await createProductionSchedule(result.schedule);
  
  return { 
    data, 
    error, 
    warning: result.success ? undefined : result.message 
  };
};
