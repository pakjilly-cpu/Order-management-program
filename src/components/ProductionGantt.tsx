import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { ProductionScheduleWithDetails } from '@/types/database';

interface ProductionGanttProps {
  schedules: ProductionScheduleWithDetails[];
  onScheduleMove: (scheduleId: string, newStartDate: string, newEndDate: string) => Promise<void>;
  isLoading?: boolean;
  viewMode?: 'week' | 'month';
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  planned: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700' },
  in_progress: { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-700' },
  completed: { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-700' },
  delayed: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700' },
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

function getDaysDiff(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
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

export const ProductionGantt: React.FC<ProductionGanttProps> = ({
  schedules,
  onScheduleMove,
  isLoading = false,
  viewMode = 'month',
}) => {
  const [hoveredSchedule, setHoveredSchedule] = useState<string | null>(null);
  const [draggingSchedule, setDraggingSchedule] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { dateRange, dates, cellWidth } = useMemo(() => {
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
      dateRange: { start: startDate, end: endDate },
      dates,
      cellWidth: viewMode === 'week' ? 60 : 40,
    };
  }, [viewMode]);

  const todayIndex = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dates.findIndex(d => d.getTime() === today.getTime());
  }, [dates]);

  const getBarPosition = useCallback((schedule: ProductionScheduleWithDetails) => {
    const startDate = parseDate(schedule.start_date);
    const endDate = parseDate(schedule.end_date);
    
    const startDiff = getDaysDiff(dateRange.start, startDate);
    const duration = getDaysDiff(startDate, endDate) + 1;
    
    return {
      left: startDiff * cellWidth,
      width: duration * cellWidth - 4,
    };
  }, [dateRange.start, cellWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent, scheduleId: string) => {
    e.preventDefault();
    setDraggingSchedule(scheduleId);
    setDragStartX(e.clientX);
    setDragOffset(0);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingSchedule) return;
    const diff = e.clientX - dragStartX;
    setDragOffset(diff);
  }, [draggingSchedule, dragStartX]);

  const handleMouseUp = useCallback(async () => {
    if (!draggingSchedule) return;
    
    const schedule = schedules.find(s => s.id === draggingSchedule);
    if (!schedule) {
      setDraggingSchedule(null);
      setDragOffset(0);
      return;
    }
    
    const daysMoved = Math.round(dragOffset / cellWidth);
    
    if (daysMoved !== 0) {
      const startDate = parseDate(schedule.start_date);
      const endDate = parseDate(schedule.end_date);
      
      const newStartDate = addDays(startDate, daysMoved);
      const newEndDate = addDays(endDate, daysMoved);
      
      await onScheduleMove(
        draggingSchedule,
        formatDate(newStartDate),
        formatDate(newEndDate)
      );
    }
    
    setDraggingSchedule(null);
    setDragOffset(0);
  }, [draggingSchedule, dragOffset, cellWidth, schedules, onScheduleMove]);

  const handleMouseLeave = useCallback(() => {
    if (draggingSchedule) {
      setDraggingSchedule(null);
      setDragOffset(0);
    }
  }, [draggingSchedule]);

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
    <div 
      ref={containerRef}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800">생산계획표</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-400" />
            <span className="text-slate-600">계획</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-400" />
            <span className="text-slate-600">진행중</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-400" />
            <span className="text-slate-600">완료</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-400" />
            <span className="text-slate-600">지연</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="flex border-b border-slate-200 bg-slate-50">
            <div className="w-48 flex-shrink-0 px-4 py-2 font-medium text-slate-600 text-sm border-r border-slate-200">
              제품명
            </div>
            <div className="flex">
              {dates.map((date, index) => (
                <div
                  key={index}
                  className={`text-center border-r border-slate-100 ${
                    isWeekend(date) ? 'bg-slate-100' : ''
                  }`}
                  style={{ width: cellWidth }}
                >
                  <div className="text-xs text-slate-500 py-1">
                    {formatDisplayDate(date)}
                  </div>
                  <div className={`text-xs pb-1 ${
                    isWeekend(date) ? 'text-red-400' : 'text-slate-400'
                  }`}>
                    {getWeekday(date)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {todayIndex >= 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                style={{ left: `${192 + todayIndex * cellWidth + cellWidth / 2}px` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
              </div>
            )}

            {schedules.map((schedule) => {
              const position = getBarPosition(schedule);
              const isDragging = draggingSchedule === schedule.id;
              const statusColors = STATUS_COLORS[schedule.status] || STATUS_COLORS.planned;
              const deliveryDate = schedule.order?.delivery_date ? parseDate(schedule.order.delivery_date) : null;
              const deliveryDayIndex = deliveryDate ? getDaysDiff(dateRange.start, deliveryDate) : null;

              return (
                <div
                  key={schedule.id}
                  className="flex border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  style={{ height: 48 }}
                >
                  <div className="w-48 flex-shrink-0 px-4 flex items-center border-r border-slate-200">
                    <div className="truncate">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {schedule.order?.product_name || '제품명 없음'}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {schedule.vendor?.name || '외주처 없음'}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 relative">
                    {dates.map((date, index) => (
                      <div
                        key={index}
                        className={`absolute top-0 bottom-0 border-r border-slate-100 ${
                          isWeekend(date) ? 'bg-slate-50' : ''
                        }`}
                        style={{ left: index * cellWidth, width: cellWidth }}
                      />
                    ))}

                    {deliveryDayIndex !== null && deliveryDayIndex >= 0 && deliveryDayIndex < dates.length && (
                      <div
                        className="absolute top-1 bottom-1 w-0.5 bg-orange-400 z-5"
                        style={{ left: deliveryDayIndex * cellWidth + cellWidth / 2 }}
                      >
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-orange-400" />
                      </div>
                    )}

                    <div
                      className={`absolute top-2 h-8 rounded-lg border-2 cursor-move transition-shadow ${
                        statusColors.bg
                      } ${statusColors.border} ${
                        isDragging ? 'shadow-lg opacity-80' : 'hover:shadow-md'
                      }`}
                      style={{
                        left: position.left + (isDragging ? dragOffset : 0),
                        width: position.width,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, schedule.id)}
                      onMouseEnter={() => setHoveredSchedule(schedule.id)}
                      onMouseLeave={() => setHoveredSchedule(null)}
                    >
                      <div className={`px-2 py-1 text-xs font-medium truncate ${statusColors.text}`}>
                        {schedule.order?.quantity?.toLocaleString() || 0}개
                      </div>

                      {hoveredSchedule === schedule.id && !isDragging && (
                        <div className="absolute bottom-full left-0 mb-2 z-20 pointer-events-none">
                          <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                            <div className="font-medium mb-1">{schedule.order?.product_name}</div>
                            <div className="text-slate-300 space-y-0.5">
                              <div>수량: {schedule.order?.quantity?.toLocaleString()}개</div>
                              <div>외주처: {schedule.vendor?.name}</div>
                              <div>시작일: {schedule.start_date}</div>
                              <div>종료일: {schedule.end_date}</div>
                              {schedule.order?.delivery_date && (
                                <div className="text-orange-300">납기일: {schedule.order.delivery_date}</div>
                              )}
                            </div>
                            <div className="absolute top-full left-4 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
