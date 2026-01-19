/**
 * VendorPortal 컴포넌트
 * 외주처 포털 - Supabase 연동
 */

import React, { useMemo, useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useVendorTargets } from '@/hooks/useVendors';
import { useProductionSchedules } from '@/hooks/useProductionSchedules';
import { ProductionGantt } from '@/components/ProductionGantt';
import type { OrderWithVendor } from '@/types/database';

interface VendorPortalProps {
  vendorId: string;
  vendorName: string;
  onBack?: () => void; // 관리자 미리보기 시 복귀 버튼
  onLogout?: () => void; // 외주처 로그인 시 로그아웃 버튼
}

// 정렬 키 타입
type SortKey = 'order_date' | 'product_code' | 'product_name' | 'quantity' | 'delivery_date';
type SortOrder = 'asc' | 'desc';

// 정렬 아이콘 컴포넌트
const SortIcon: React.FC<{ active: boolean; order: SortOrder }> = ({ active, order }) => (
  <span className={`ml-1 inline-flex ${active ? 'text-blue-600' : 'text-slate-300'}`}>
    {order === 'asc' ? (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" />
      </svg>
    ) : (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" />
      </svg>
    )}
  </span>
);

// 달성율 상태 계산 함수
const getProgressStatus = (currentQty: number, targetQty: number, workingDays: number = 20) => {
  if (targetQty === 0) return null;
  
  const today = new Date();
  const currentDay = today.getDate();
  const dailyTarget = targetQty / workingDays;
  const expectedQty = dailyTarget * Math.min(currentDay, workingDays);
  
  const ratio = currentQty / expectedQty;
  
  if (ratio < 0.9) {
    return {
      status: 'behind',
      message: '발주가 부족해요, 서두르세요!',
      icon: '🔥',
      bgColor: 'bg-gradient-to-r from-red-50 to-orange-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
      iconBg: 'bg-red-100',
    };
  } else if (ratio <= 1.1) {
    return {
      status: 'on_track',
      message: '지금까지는 나쁘지 않아요!',
      icon: '👍',
      bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      iconBg: 'bg-blue-100',
    };
  } else {
    return {
      status: 'ahead',
      message: '잘하고 있어요!',
      icon: '🎉',
      bgColor: 'bg-gradient-to-r from-emerald-50 to-teal-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-700',
      iconBg: 'bg-emerald-100',
    };
  }
};

export const VendorPortal: React.FC<VendorPortalProps> = ({
  vendorId,
  vendorName,
  onBack,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'schedule' | 'report'>('list');
  
  // 정렬 상태
  const [sortKey, setSortKey] = useState<SortKey>('order_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const { orders, isLoading, error, toggleComplete, refetch } = useOrders({ vendorId });
  const { 
    schedules, 
    isLoading: schedulesLoading, 
    moveSchedule 
  } = useProductionSchedules({ vendorId });

  // 목표 데이터 조회
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const { targets, isLoading: targetsLoading } = useVendorTargets({
    year: currentYear,
    month: currentMonth
  });

  // 현재 외주처의 목표 수량
  const vendorTarget = useMemo(() => {
    const target = targets.find(t => t.vendor_id === vendorId);
    return target?.target_quantity || 0;
  }, [targets, vendorId]);

  // 정렬된 주문 목록
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      
      switch (sortKey) {
        case 'order_date':
          aVal = a.order_date || '';
          bVal = b.order_date || '';
          break;
        case 'product_code':
          aVal = a.product_code || '';
          bVal = b.product_code || '';
          break;
        case 'product_name':
          aVal = a.product_name || '';
          bVal = b.product_name || '';
          break;
        case 'quantity':
          aVal = a.quantity;
          bVal = b.quantity;
          break;
        case 'delivery_date':
          aVal = a.delivery_date || '';
          bVal = b.delivery_date || '';
          break;
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [orders, sortKey, sortOrder]);

  // 완료 상태 계산
  const completedCount = orders.filter(o => o.is_completed).length;
  const progress = orders.length > 0 ? (completedCount / orders.length) * 100 : 0;

  // 관리자 모드(미리보기)인지 외주처 모드(실제 접속)인지 확인
  const isVendorMode = !onBack;

  // 발주 리포트용 데이터 (제품코드 "9"로 시작하는 것만)
  const reportData = useMemo(() => {
    const filtered = orders.filter(o => o.product_code?.startsWith('9'));
    const totalQty = filtered.reduce((sum, o) => sum + o.quantity, 0);
    const achievementRate = vendorTarget > 0 ? (totalQty / vendorTarget) * 100 : 0;
    const progressStatus = getProgressStatus(totalQty, vendorTarget);
    return { totalQty, target: vendorTarget, achievementRate, progressStatus };
  }, [orders, vendorTarget]);

  // 월별 발주 수량 데이터 (최근 12개월)
  const monthlyData = useMemo(() => {
    const filtered = orders.filter(o => o.product_code?.startsWith('9'));
    const monthMap: Record<string, number> = {};
    
    filtered.forEach(order => {
      if (order.order_date) {
        const date = new Date(order.order_date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthMap[key] = (monthMap[key] || 0) + order.quantity;
      }
    });

    // 최근 12개월 기준으로 정렬
    const sortedMonths = Object.keys(monthMap).sort().slice(-12);
    const maxQty = Math.max(...sortedMonths.map(k => monthMap[k]), 1);
    
    return sortedMonths.map(key => {
      const [year, month] = key.split('-');
      return {
        key,
        year,
        month: parseInt(month),
        quantity: monthMap[key],
        percentage: (monthMap[key] / maxQty) * 100
      };
    });
  }, [orders]);

  // 정렬 핸들러
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // 체크 토글 핸들러
  const handleToggleItem = async (orderId: string) => {
    await toggleComplete(orderId);
  };

  // 전체 체크/해제
  const handleToggleAll = async () => {
    const allCompleted = orders.every(item => item.is_completed);
    const itemsToToggle = allCompleted
      ? orders.filter(item => item.is_completed)
      : orders.filter(item => !item.is_completed);

    for (const item of itemsToToggle) {
      await toggleComplete(item.id);
    }
  };

  // 정렬 가능한 테이블 헤더 컴포넌트
  const SortableHeader: React.FC<{ 
    label: string; 
    sortKeyName: SortKey; 
    align?: 'left' | 'right' | 'center';
    className?: string;
  }> = ({ label, sortKeyName, align = 'center', className = '' }) => (
    <th
      onClick={() => handleSort(sortKeyName)}
      className={`px-3 py-3 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors select-none whitespace-nowrap text-center ${className}`}
    >
      <span className="inline-flex items-center justify-center">
        {label}
        <SortIcon active={sortKey === sortKeyName} order={sortKey === sortKeyName ? sortOrder : 'asc'} />
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-4 shadow-sm transition-all">
        <div className="max-w-2xl mx-auto">
          {/* Header Controls */}
          <div className="flex justify-between items-center mb-4">
            {!isVendorMode ? (
              <button
                onClick={onBack}
                className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                관리자 화면 복귀
              </button>
            ) : (
              <div className="flex w-full justify-between items-center">
                <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full font-bold border border-green-100">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  보안 접속 중
                </div>
                <button
                  onClick={onLogout}
                  className="text-xs text-slate-400 hover:text-slate-600 underline"
                >
                  로그아웃
                </button>
              </div>
            )}

            {/* 외주처용 전화하기 버튼 */}
            {isVendorMode && (
              <a
                href="tel:01012345678"
                className="ml-2 text-sm text-blue-600 font-semibold flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg active:bg-blue-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                문의
              </a>
            )}
          </div>

          {/* 외주처명 및 진행 상태 */}
          <div className="flex justify-between items-end mt-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{vendorName}</h1>
            </div>
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-3xl font-bold text-blue-600 tabular-nums">{completedCount}</span>
                <span className="text-slate-400 text-lg tabular-nums">/{orders.length}</span>
              </div>
              <span className="text-xs text-slate-400 font-medium">체크 완료</span>
            </div>
          </div>

          {/* 진행률 바 */}
          <div className="w-full bg-slate-100 h-2 mt-4 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* 탭 메뉴 - 외주처 모드에서만 표시 */}
          {isVendorMode && (
            <div className="flex mt-4 border-b border-slate-200">
              <button
                onClick={() => setActiveTab('list')}
                className={`flex-1 pb-2 text-sm font-medium transition-colors relative ${
                  activeTab === 'list' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                발주 목록
                {activeTab === 'list' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 pb-2 text-sm font-medium transition-colors relative ${
                  activeTab === 'schedule' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                생산계획
                {activeTab === 'schedule' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
              </button>
              <button
                onClick={() => setActiveTab('report')}
                className={`flex-1 pb-2 text-sm font-medium transition-colors relative ${
                  activeTab === 'report' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                발주 리포트
                {activeTab === 'report' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            <p className="font-medium">데이터를 불러오는 중 오류가 발생했습니다.</p>
            <p className="text-sm mt-1">{error.message}</p>
            <button
              onClick={refetch}
              className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 생산계획표 탭 */}
        {activeTab === 'schedule' && isVendorMode && !isLoading && !error && (
          <div className="space-y-4">
            <ProductionGantt
              schedules={schedules}
              onScheduleMove={async (scheduleId, newStartDate, newEndDate) => {
                await moveSchedule(scheduleId, newStartDate, newEndDate);
              }}
              isLoading={schedulesLoading}
            />
          </div>
        )}

        {/* 발주 리포트 탭 */}
        {activeTab === 'report' && isVendorMode && !isLoading && !error && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <line x1="10" y1="9" x2="8" y2="9"/>
              </svg>
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })} 발주 리포트
            </h3>
            <p className="text-sm text-slate-500 mb-6">제품코드 "9"로 시작하는 품목만 집계됩니다.</p>

            {targetsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : reportData.target === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>목표 수량이 설정되지 않았습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 달성율 상태 표시 카드 */}
                {reportData.progressStatus && (
                  <div className={`${reportData.progressStatus.bgColor} ${reportData.progressStatus.borderColor} border rounded-xl p-4 mb-6`}>
                    <div className="flex items-center gap-3">
                      <div className={`${reportData.progressStatus.iconBg} w-12 h-12 rounded-full flex items-center justify-center text-2xl`}>
                        {reportData.progressStatus.icon}
                      </div>
                      <div className="flex-1">
                        <p className={`font-bold text-lg ${reportData.progressStatus.textColor}`}>
                          {reportData.progressStatus.message}
                        </p>
                        <p className="text-sm text-slate-500 mt-0.5">
                          오늘 기준 예상 목표: {Math.round((reportData.target / 20) * new Date().getDate()).toLocaleString()}개
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 달성률 표시 */}
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-700">
                    {vendorName}
                  </div>
                  <div className="text-sm text-slate-500">
                    <span className="font-bold text-blue-600">{reportData.achievementRate.toFixed(1)}%</span>
                    <span className="text-slate-400 ml-1">달성</span>
                  </div>
                </div>

                {/* 막대 그래프 */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-10 bg-slate-100 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-3"
                      style={{
                        width: `${Math.min(reportData.achievementRate, 100)}%`,
                        backgroundColor: reportData.progressStatus?.status === 'behind' ? '#EF4444' :
                                        reportData.progressStatus?.status === 'ahead' ? '#10B981' : '#3B82F6'
                      }}
                    >
                      {reportData.achievementRate >= 20 && (
                        <span className="text-white text-lg font-bold drop-shadow">
                          {reportData.totalQty.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {reportData.achievementRate < 20 && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-lg font-bold">
                        {reportData.totalQty.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="w-28 text-right text-xs text-slate-400 flex-shrink-0">
                    목표: {reportData.target.toLocaleString()}
                  </div>
                </div>

                {/* 상세 정보 */}
                <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{reportData.totalQty.toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">현재 발주 수량</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-400">{(reportData.target - reportData.totalQty).toLocaleString()}</div>
                    <div className="text-xs text-slate-500 mt-1">목표까지 남은 수량</div>
                  </div>
                </div>

                {/* 월별 발주 추이 */}
                {monthlyData.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-4">월별 발주 추이</h4>
                    
                    {/* 막대 영역 + 라벨 + 꺾은선 SVG */}
                    <div className="relative h-32">
                      {/* 막대들 + 상단 라벨 */}
                      <div className="flex items-end h-full">
                        {monthlyData.map((data, index) => {
                          const isCurrentMonth = index === monthlyData.length - 1;
                          const isAchieved = vendorTarget > 0 && data.quantity >= vendorTarget;
                          const barHeight = Math.max(data.percentage, 4);
                          return (
                            <div key={data.key} className="flex-1 flex flex-col items-center justify-end h-full px-0.5">
                              {/* 막대 위 라벨 */}
                              <div className="flex flex-col items-center mb-1">
                                {isCurrentMonth ? (
                                  <span className="text-[8px] font-semibold text-emerald-600">진행중</span>
                                ) : vendorTarget > 0 ? (
                                  <span className={`text-[8px] font-semibold ${isAchieved ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {isAchieved ? '달성' : '미달'}
                                  </span>
                                ) : (
                                  <span className="text-[8px]">&nbsp;</span>
                                )}
                                <span className="text-[9px] whitespace-nowrap font-bold text-slate-600">
                                  {data.quantity > 0 ? (data.quantity / 10000).toFixed(0) + '만' : ''}
                                </span>
                              </div>
                              {/* 막대 */}
                              <div
                                className="w-full max-w-[28px] rounded-t transition-all duration-300"
                                style={{
                                  height: `${barHeight}%`,
                                  backgroundColor: isCurrentMonth 
                                    ? 'rgba(59, 130, 246, 0.4)' 
                                    : isAchieved && vendorTarget > 0
                                      ? 'rgba(16, 185, 129, 0.3)'
                                      : 'rgba(203, 213, 225, 0.5)'
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* 꺾은선 - 막대 상단 연결 */}
                      <svg 
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        viewBox={`0 0 ${monthlyData.length * 100} 100`}
                        preserveAspectRatio="none"
                      >
                        <polyline
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="6,4"
                          vectorEffect="non-scaling-stroke"
                          points={monthlyData.map((data, index) => {
                            const x = (index * 100) + 50;
                            const barHeightPercent = Math.max(data.percentage, 4);
                            // 라벨 영역(약 30%) 고려해서 y 계산
                            const y = 70 - (barHeightPercent * 0.7);
                            return `${x},${y}`;
                          }).join(' ')}
                        />
                      </svg>
                    </div>
                    
                    {/* 하단: 월 라벨 */}
                    <div className="flex mt-1">
                      {monthlyData.map((data, index) => (
                        <div key={data.key} className="flex-1 flex flex-col items-center px-0.5">
                          <span className="text-[10px] text-slate-500 font-medium">{data.month}월</span>
                          {(data.month === 1 || index === 0) && (
                            <span className="text-[9px] text-slate-400">{data.year}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 발주 목록 */}
        {(activeTab === 'list' || !isVendorMode) && !isLoading && !error && (
          <div>
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <svg className="w-12 h-12 mb-3 opacity-20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-8-2h2v-4h4v-2h-4V7h-2v4H7v2h4z"/>
                </svg>
                <p>배정된 발주 내역이 없습니다.</p>
              </div>
            ) : isVendorMode ? (
              /* 외주처 모드 - 모바일: 카드 형식, 데스크톱: 표 형식 */
              <div className="space-y-3">
                {/* 전체 체크 버튼 */}
                <div className="flex justify-end">
                  <button
                    onClick={handleToggleAll}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      orders.every(item => item.is_completed)
                        ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {orders.every(item => item.is_completed) ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        전체 해제
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        전체 체크
                      </>
                    )}
                  </button>
                </div>

                {/* 모바일: 카드 형식 */}
                <div className="md:hidden space-y-3">
                  {sortedOrders.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleItem(item.id)}
                      className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer transition-colors ${
                        item.is_completed ? 'bg-slate-50' : 'active:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200
                          ${item.is_completed
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-slate-300 bg-white'
                          }`}
                        >
                          {item.is_completed && (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-base ${item.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            {item.product_name}
                          </div>
                          <div className={`text-xs font-mono mt-1 ${item.is_completed ? 'text-slate-400' : 'text-slate-500'}`}>
                            {item.product_code || '-'}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                            <span className={item.is_completed ? 'text-slate-400' : 'text-blue-600'}>
                              발주: {item.order_date || '-'}
                            </span>
                            <span className={item.is_completed ? 'text-slate-400' : 'text-slate-600'}>
                              납기: {item.delivery_date || '-'}
                            </span>
                          </div>
                        </div>
                        <div className={`text-right flex-shrink-0 ${item.is_completed ? 'text-slate-400' : 'text-blue-700'}`}>
                          <div className="text-lg font-bold">{item.quantity.toLocaleString()}</div>
                          <div className="text-xs text-slate-400">수량</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 데스크톱: 테이블 형식 */}
                <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-3 text-center font-semibold text-slate-600 w-14">확인</th>
                        <SortableHeader label="발주일" sortKeyName="order_date" />
                        <SortableHeader label="품목" sortKeyName="product_code" />
                        <SortableHeader label="품명" sortKeyName="product_name" />
                        <SortableHeader label="수량" sortKeyName="quantity" align="right" />
                        <SortableHeader label="납기일" sortKeyName="delivery_date" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedOrders.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => handleToggleItem(item.id)}
                          className={`cursor-pointer transition-colors ${
                            item.is_completed ? 'bg-slate-50' : 'hover:bg-blue-50'
                          }`}
                        >
                          <td className="px-3 py-3">
                            <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
                              ${item.is_completed
                                ? 'bg-blue-500 border-blue-500 text-white'
                                : 'border-slate-300 bg-white'
                              }`}
                            >
                              {item.is_completed && (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                                </svg>
                              )}
                            </div>
                          </td>
                          <td className={`px-3 py-3 font-medium ${
                            item.is_completed ? 'text-slate-400' : 'text-blue-600'
                          }`}>
                            {item.order_date || '-'}
                          </td>
                          <td className={`px-3 py-3 font-mono text-xs ${
                            item.is_completed ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {item.product_code || '-'}
                          </td>
                          <td className={`px-3 py-3 font-medium ${
                            item.is_completed ? 'text-slate-400 line-through' : 'text-slate-800'
                          }`}>
                            {item.product_name}
                          </td>
                          <td className={`px-3 py-3 text-right font-bold ${
                            item.is_completed ? 'text-slate-400' : 'text-blue-700'
                          }`}>
                            {item.quantity.toLocaleString()}
                          </td>
                          <td className={`px-3 py-3 ${
                            item.is_completed ? 'text-slate-400' : 'text-slate-600'
                          }`}>
                            {item.delivery_date || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* 관리자 미리보기 모드 */
              <>
                {/* 모바일: 카드 형식 */}
                <div className="md:hidden space-y-3">
                  {sortedOrders.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-base text-slate-800">
                            {item.product_name}
                          </div>
                          <div className="text-xs font-mono mt-1 text-slate-500">
                            {item.product_code || '-'}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                            <span className="text-blue-600">
                              발주: {item.order_date || '-'}
                            </span>
                            <span className="text-slate-600">
                              납기: {item.delivery_date || '-'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 text-blue-700">
                          <div className="text-lg font-bold">{item.quantity.toLocaleString()}</div>
                          <div className="text-xs text-slate-400">수량</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 데스크톱: 테이블 형식 */}
                <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <SortableHeader label="발주일" sortKeyName="order_date" className="px-4" />
                        <SortableHeader label="품목" sortKeyName="product_code" className="px-4" />
                        <SortableHeader label="품명" sortKeyName="product_name" className="px-4" />
                        <SortableHeader label="수량" sortKeyName="quantity" align="right" className="px-4" />
                        <SortableHeader label="납기일" sortKeyName="delivery_date" className="px-4" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedOrders.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-blue-600 font-medium">
                            {item.order_date || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                            {item.product_code || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-800 font-medium">
                            {item.product_name}
                          </td>
                          <td className="px-4 py-3 text-right text-blue-700 font-bold">
                            {item.quantity.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.delivery_date || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Completion Toast */}
      {progress === 100 && orders.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 px-6 flex justify-center z-50 pointer-events-none">
          <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-3 animate-bounce-in pointer-events-auto shadow-emerald-600/30">
            <div className="bg-white/20 p-1 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium opacity-90">확인 완료</div>
              <div className="text-base">모든 물품을 확인했습니다</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
