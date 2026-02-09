import React, { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { ProductionScheduleWithDetails, Vendor } from '@/types/database';

const GANTT_VENDOR_NAMES = ['위드맘', '리니어', '그램', '이시스', '엘루오', '케이코스텍', '다미'];

interface ProductionGanttProps {
  schedules: ProductionScheduleWithDetails[];
  vendors: Vendor[];
  onScheduleMove: (scheduleId: string, newStartDate: string, newEndDate: string) => Promise<void>;
  isLoading?: boolean;
  viewMode?: 'week' | 'month';
}

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-700 border-blue-300',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-300',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  delayed: 'bg-red-100 text-red-700 border-red-300',
};

const VENDOR_COLORS: Record<string, string> = {
  '위드맘': 'bg-purple-500',
  '리니어': 'bg-blue-500',
  '그램': 'bg-emerald-500',
  '이시스': 'bg-orange-500',
  '엘루오': 'bg-pink-500',
  '케이코스텍': 'bg-cyan-500',
  '다미': 'bg-amber-500',
};

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

function formatDisplayDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getWeekday(date: Date): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[date.getDay()];
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

function isDateInRange(date: Date, startStr: string, endStr: string): boolean {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return d >= start && d <= end;
}

interface MoveValidationResult {
  valid: boolean;
  reason?: string;
}

function validateScheduleMove(
  schedule: ProductionScheduleWithDetails,
  newStartDate: Date,
  newEndDate: Date
): MoveValidationResult {
  if (isWeekend(newStartDate)) {
    return { valid: false, reason: '주말에는 생산을 시작할 수 없습니다.' };
  }

  if (isWeekend(newEndDate)) {
    return { valid: false, reason: '주말에는 생산을 종료할 수 없습니다.' };
  }

  if (schedule.earliest_production_date) {
    const earliestDate = parseDate(schedule.earliest_production_date);
    if (newStartDate < earliestDate) {
      return { 
        valid: false, 
        reason: `최소 생산 시작일(${schedule.earliest_production_date}) 이전으로 이동할 수 없습니다.` 
      };
    }
  }

  if (schedule.order?.delivery_date) {
    const deliveryDate = parseDate(schedule.order.delivery_date);
    if (newEndDate > deliveryDate) {
      return { 
        valid: false, 
        reason: `납기일(${schedule.order.delivery_date})을 초과하여 이동할 수 없습니다.` 
      };
    }
  }

  return { valid: true };
}

interface DraggableScheduleProps {
  schedule: ProductionScheduleWithDetails;
  spanDays: number;
  cellWidth: number;
  isBeingDragged: boolean;
}

function DraggableSchedule({ schedule, spanDays, cellWidth, isBeingDragged }: DraggableScheduleProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: schedule.id,
    data: { schedule, spanDays },
  });

  if (isBeingDragged) {
    return (
      <div 
        className="absolute inset-y-1 left-0.5 rounded border-2 border-dashed border-slate-300 bg-slate-100"
        style={{ width: cellWidth * spanDays - 4 }}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`absolute inset-y-1 left-0.5 rounded px-1 py-0.5 text-xs font-medium border cursor-grab active:cursor-grabbing select-none ${
        STATUS_COLORS[schedule.status] || STATUS_COLORS.planned
      } ${isDragging ? 'opacity-0' : ''}`}
      style={{ width: cellWidth * spanDays - 4, zIndex: isDragging ? -1 : 1 }}
    >
      <div className="truncate leading-tight">
        {schedule.order?.product_name || '-'}
      </div>
      <div className="text-[10px] opacity-70 truncate">
        {Math.ceil((schedule.order?.quantity || 0) / spanDays).toLocaleString()}개/일
      </div>
    </div>
  );
}

interface DroppableCellProps {
  cellKey: string;
  date: Date;
  vendorId: string;
  lineNumber: number;
  cellWidth: number;
  isWeekendDay: boolean;
  isOver: boolean;
  children: React.ReactNode;
  onHover: (key: string | null) => void;
}

function DroppableCell({ 
  cellKey, 
  date, 
  vendorId, 
  cellWidth, 
  isWeekendDay, 
  isOver,
  children,
  onHover,
}: DroppableCellProps) {
  const { setNodeRef } = useDroppable({
    id: cellKey,
    data: { date, vendorId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`border-r border-slate-100 relative ${isWeekendDay ? 'bg-slate-50' : ''} ${
        isOver ? 'bg-blue-100' : ''
      }`}
      style={{ width: cellWidth }}
      onMouseEnter={() => onHover(cellKey)}
      onMouseLeave={() => onHover(null)}
    >
      {children}
    </div>
  );
}

interface VendorLine {
  vendorId: string;
  vendorName: string;
  lineNumber: number;
  key: string;
}

interface CellSchedule {
  schedule: ProductionScheduleWithDetails;
  isStart: boolean;
  isEnd: boolean;
  spanDays: number;
}

interface ToastState {
  show: boolean;
  message: string;
  type: 'error' | 'success';
}

export const ProductionGantt: React.FC<ProductionGanttProps> = ({
  schedules,
  vendors,
  onScheduleMove,
  isLoading = false,
  viewMode = 'month',
}) => {
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [activeSchedule, setActiveSchedule] = useState<ProductionScheduleWithDetails | null>(null);
  const [overCellId, setOverCellId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'error' });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const showToast = useCallback((message: string, type: 'error' | 'success' = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 3000);
  }, []);

  const { dates, cellWidth } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysToShow = viewMode === 'week' ? 14 : 31;
    const startDate = addDays(today, -3);
    const endDate = addDays(today, daysToShow - 4);
    
    const dates: Date[] = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      dates.push(new Date(current));
      current = addDays(current, 1);
    }
    
    return {
      dates,
      cellWidth: viewMode === 'week' ? 80 : 56,
    };
  }, [viewMode]);

  const todayIndex = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dates.findIndex(d => isSameDay(d, today));
  }, [dates]);

  const vendorGroups = useMemo(() => {
    const groups: Record<string, { vendorId: string; vendorName: string; schedules: ProductionScheduleWithDetails[]; lineCount: number }> = {};
    
    const filteredVendors = vendors.filter(v => GANTT_VENDOR_NAMES.includes(v.name));
    
    filteredVendors.forEach(vendor => {
      groups[vendor.id] = {
        vendorId: vendor.id,
        vendorName: vendor.name,
        schedules: [],
        lineCount: vendor.line_count || 1,
      };
    });
    
    schedules.forEach(schedule => {
      const vendorId = schedule.vendor_id;
      if (groups[vendorId]) {
        groups[vendorId].schedules.push(schedule);
      }
    });

    return GANTT_VENDOR_NAMES
      .map(name => Object.values(groups).find(g => g.vendorName === name))
      .filter((g): g is NonNullable<typeof g> => g !== undefined);
  }, [schedules, vendors]);

  const vendorLines = useMemo((): VendorLine[] => {
    const lines: VendorLine[] = [];
    
    vendorGroups.forEach(group => {
      const lineCount = Math.max(group.lineCount, 1);
      for (let i = 1; i <= lineCount; i++) {
        lines.push({
          vendorId: group.vendorId,
          vendorName: group.vendorName,
          lineNumber: i,
          key: `${group.vendorId}-${i}`,
        });
      }
    });
    
    return lines;
  }, [vendorGroups]);

  const getScheduleForCell = useCallback((vendorId: string, lineNumber: number, date: Date): CellSchedule | null => {
    const group = vendorGroups.find(g => g.vendorId === vendorId);
    if (!group) return null;

    const lineSchedules = group.schedules.filter((_, idx) => (idx % group.lineCount) + 1 === lineNumber);
    
    for (const schedule of lineSchedules) {
      if (isDateInRange(date, schedule.start_date, schedule.end_date)) {
        const startDate = parseDate(schedule.start_date);
        const endDate = parseDate(schedule.end_date);
        const isStart = isSameDay(date, startDate);
        const isEnd = isSameDay(date, endDate);
        const spanDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        return { schedule, isStart, isEnd, spanDays };
      }
    }
    return null;
  }, [vendorGroups]);

  const toggleVendor = useCallback((vendorId: string) => {
    setExpandedVendors(prev => {
      const next = new Set(prev);
      if (next.has(vendorId)) {
        next.delete(vendorId);
      } else {
        next.add(vendorId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedVendors(new Set(vendorGroups.map(g => g.vendorId)));
  }, [vendorGroups]);

  const collapseAll = useCallback(() => {
    setExpandedVendors(new Set());
  }, []);

  const [activeSpanDays, setActiveSpanDays] = useState<number>(1);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const schedule = event.active.data.current?.schedule as ProductionScheduleWithDetails;
    const spanDays = event.active.data.current?.spanDays as number || 1;
    setActiveSchedule(schedule);
    setActiveSpanDays(spanDays);
  }, []);

  const handleDragOver = useCallback((event: { over: { id: string } | null }) => {
    setOverCellId(event.over?.id as string | null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSchedule(null);
    setOverCellId(null);

    if (!over || !active.data.current?.schedule) return;

    const schedule = active.data.current.schedule as ProductionScheduleWithDetails;
    const dropData = over.data.current as { date: Date; vendorId: string } | undefined;
    
    if (!dropData) return;

    if (schedule.vendor_id !== dropData.vendorId) {
      showToast('다른 외주처로는 이동할 수 없습니다.', 'error');
      return;
    }

    const originalStart = parseDate(schedule.start_date);
    const originalEnd = parseDate(schedule.end_date);
    const duration = Math.round((originalEnd.getTime() - originalStart.getTime()) / (1000 * 60 * 60 * 24));

    const newStartDate = new Date(dropData.date);
    const newEndDate = addDays(newStartDate, duration);

    const validation = validateScheduleMove(schedule, newStartDate, newEndDate);
    if (!validation.valid) {
      showToast(validation.reason || '이동이 불가능합니다.', 'error');
      return;
    }

    try {
      await onScheduleMove(schedule.id, formatDate(newStartDate), formatDate(newEndDate));
      showToast('일정이 변경되었습니다.', 'success');
    } catch (error) {
      showToast('일정 변경에 실패했습니다.', 'error');
    }
  }, [onScheduleMove, showToast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900">생산계획이 없습니다</h3>
        <p className="text-slate-500 mt-1 text-sm">발주를 등록하면 자동으로 생산계획이 생성됩니다.</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
        {toast.show && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
          }`}>
            {toast.type === 'error' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        )}

        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">외주 생산계획표</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatDate(dates[0])} ~ {formatDate(dates[dates.length - 1])}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button onClick={expandAll} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                전체 펼치기
              </button>
              <span className="text-slate-300">|</span>
              <button onClick={collapseAll} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                전체 접기
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-200 border border-blue-300" />
                <span className="text-slate-600">계획</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-200 border border-amber-300" />
                <span className="text-slate-600">진행중</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-200 border border-emerald-300" />
                <span className="text-slate-600">완료</span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-max">
            <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
              <div className="w-36 flex-shrink-0 px-3 py-2 font-medium text-slate-600 text-xs border-r border-slate-200">
                외주처 / 라인
              </div>
              <div className="flex">
                {dates.map((date, index) => (
                  <div
                    key={index}
                    className={`text-center border-r border-slate-100 ${
                      isWeekend(date) ? 'bg-slate-100' : ''
                    } ${todayIndex === index ? 'bg-red-50' : ''}`}
                    style={{ width: cellWidth }}
                  >
                    <div className={`text-xs py-1 ${todayIndex === index ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                      {formatDisplayDate(date)}
                    </div>
                    <div className={`text-xs pb-1 ${
                      isWeekend(date) ? 'text-red-400' : todayIndex === index ? 'text-red-500 font-bold' : 'text-slate-400'
                    }`}>
                      {getWeekday(date)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              {vendorGroups.map((group) => {
                const isExpanded = expandedVendors.has(group.vendorId);
                const vendorColor = VENDOR_COLORS[group.vendorName] || 'bg-slate-500';
                const lines = vendorLines.filter(l => l.vendorId === group.vendorId);

                return (
                  <div key={group.vendorId}>
                    <div
                      onClick={() => toggleVendor(group.vendorId)}
                      className="flex border-b border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                      style={{ height: 40 }}
                    >
                      <div className="w-36 flex-shrink-0 px-3 flex items-center border-r border-slate-200 gap-2">
                        <div className={`w-1 h-6 rounded-full ${vendorColor}`} />
                        <svg
                          className={`w-3 h-3 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="font-semibold text-slate-800 text-sm truncate">{group.vendorName}</span>
                        <span className="text-xs text-slate-400 flex-shrink-0">({group.schedules.length})</span>
                      </div>
                      <div className="flex-1 flex">
                        {dates.map((date, index) => (
                          <div
                            key={index}
                            className={`border-r border-slate-100 ${isWeekend(date) ? 'bg-slate-100/50' : ''}`}
                            style={{ width: cellWidth }}
                          />
                        ))}
                      </div>
                    </div>

                    {isExpanded && lines.map((line) => (
                      <div
                        key={line.key}
                        className="flex border-b border-slate-100 hover:bg-blue-50/20 transition-colors"
                        style={{ height: 44 }}
                      >
                        <div className="w-36 flex-shrink-0 px-3 pl-8 flex items-center border-r border-slate-200">
                          <span className="text-xs text-slate-500">Line {line.lineNumber}</span>
                        </div>
                        <div className="flex-1 flex">
                          {dates.map((date, dateIndex) => {
                            const cellData = getScheduleForCell(line.vendorId, line.lineNumber, date);
                            const cellKey = `${line.key}-${dateIndex}`;
                            const isHovered = hoveredCell === cellKey;
                            const isDropOver = overCellId === cellKey;

                            return (
                              <React.Fragment key={dateIndex}>
                              <DroppableCell
                                cellKey={cellKey}
                                date={date}
                                vendorId={line.vendorId}
                                lineNumber={line.lineNumber}
                                cellWidth={cellWidth}
                                isWeekendDay={isWeekend(date)}
                                isOver={isDropOver}
                                onHover={setHoveredCell}
                              >
                                {cellData && cellData.isStart && (
                                  <DraggableSchedule
                                    schedule={cellData.schedule}
                                    spanDays={cellData.spanDays}
                                    cellWidth={cellWidth}
                                    isBeingDragged={activeSchedule?.id === cellData.schedule.id}
                                  />
                                )}

                                {isHovered && cellData && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 pointer-events-none">
                                    <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                      <div className="font-medium mb-1">{cellData.schedule.order?.product_name}</div>
                                      <div className="text-slate-300 space-y-0.5">
                                        <div>수량: {cellData.schedule.order?.quantity?.toLocaleString()}개</div>
                                        {cellData.schedule.order?.delivery_date && (
                                          <div className="text-orange-300">납기: {cellData.schedule.order.delivery_date}</div>
                                        )}
                                        {cellData.schedule.earliest_production_date && (
                                          <div className="text-cyan-300">최소시작: {cellData.schedule.earliest_production_date}</div>
                                        )}
                                      </div>
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800" />
                                    </div>
                                  </div>
                                )}
                              </DroppableCell>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeSchedule && (
          <div 
            className={`rounded px-2 py-2 text-xs font-medium border-2 shadow-xl ${
              STATUS_COLORS[activeSchedule.status] || STATUS_COLORS.planned
            }`}
            style={{ 
              width: cellWidth * activeSpanDays - 4,
              opacity: 0.9,
            }}
          >
            <div className="truncate font-semibold">{activeSchedule.order?.product_name || '-'}</div>
            <div className="text-[10px] opacity-70">{activeSchedule.order?.quantity?.toLocaleString()}개</div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
