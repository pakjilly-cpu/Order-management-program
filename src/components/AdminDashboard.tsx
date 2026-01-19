/**
 * AdminDashboard 컴포넌트
 * 관리자 대시보드 - Supabase 연동
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { User as DbUser, OrderInsert, Vendor, FileUploadWithUser, Order } from '@/types/database';
import { User } from '@/types';
import { useOrders } from '@/hooks/useOrders';
import { useVendors, useVendorTargets } from '@/hooks/useVendors';
import { useProductionSchedules } from '@/hooks/useProductionSchedules';
import { createFileUpload, getFileUploads } from '@/services/fileUploadService';
import { FileUpload } from '@/components/FileUpload';
import { VendorCard } from '@/components/VendorCard';
import { UserManagement } from '@/components/UserManagement';
import { ProductionGantt } from '@/components/ProductionGantt';

interface AdminDashboardProps {
  user: User;
  dbUser: DbUser;
  onNavigateToVendor: (vendorId: string, vendorName: string) => void;
  onLogout: () => void;
}

type TabType = 'input' | 'list' | 'schedule' | 'report' | 'users';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  dbUser,
  onNavigateToVendor,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('input');
  const [notification, setNotification] = useState<string | null>(null);
  const [fileUploads, setFileUploads] = useState<FileUploadWithUser[]>([]);
  const [fileUploadsLoading, setFileUploadsLoading] = useState(false);

  const { orders, isLoading: ordersLoading, error: ordersError, addOrders, removeAllOrders, refetch: refetchOrders } = useOrders();
  const { vendors, isLoading: vendorsLoading, error: vendorsError } = useVendors();
  const { 
    schedules, 
    isLoading: schedulesLoading, 
    moveSchedule, 
    generateSchedules,
    refetch: refetchSchedules 
  } = useProductionSchedules();

  // 리포트용 목표 데이터
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const { targets, isLoading: targetsLoading } = useVendorTargets({
    year: currentYear,
    month: currentMonth
  });

  // 외주처별 목표 수량 매핑
  const vendorTargetsMap = useMemo(() => {
    const map: Record<string, number> = {};
    targets.forEach(target => {
      if (target.vendor) {
        map[target.vendor.name] = target.target_quantity;
      }
    });
    return map;
  }, [targets]);

  // 알림 표시
  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // 파일 업로드 완료 핸들러
  const handleUploadComplete = useCallback(async (
    ordersToInsert: OrderInsert[],
    fileName: string,
    orderDate: string
  ) => {
    // 주문 저장
    const { success, error } = await addOrders(ordersToInsert);

    if (!success || error) {
      throw new Error(error?.message || '주문 저장에 실패했습니다.');
    }

    // 업로드 이력 저장
    await createFileUpload({
      file_name: fileName,
      order_count: ordersToInsert.length,
      order_date: orderDate,
      uploaded_by: dbUser.id
    });

    showNotification(`${ordersToInsert.length}건의 발주가 등록되었습니다.`);
    setActiveTab('list');
    
    setTimeout(async () => {
      await refetchOrders();
      const { data: latestOrders } = await import('@/services/orderService').then(m => m.getOrders());
      if (latestOrders && latestOrders.length > 0 && vendors.length > 0) {
        const ordersForSchedule = latestOrders.filter(o => 
          !schedules.some(s => s.order_id === o.id)
        ) as Order[];
        if (ordersForSchedule.length > 0) {
          await generateSchedules(ordersForSchedule, vendors);
        }
      }
    }, 500);
  }, [addOrders, dbUser.id, showNotification, refetchOrders, vendors, schedules, generateSchedules]);

  // 파일 업로드 이력 불러오기
  const loadFileUploads = useCallback(async () => {
    setFileUploadsLoading(true);
    try {
      const { data, error } = await getFileUploads();
      if (error) throw error;
      setFileUploads(data || []);
    } catch (error) {
      console.error('파일 업로드 이력 조회 오류:', error);
    } finally {
      setFileUploadsLoading(false);
    }
  }, []);

  // 컴포넌트 마운트 시 파일 업로드 이력 불러오기
  useEffect(() => {
    loadFileUploads();
  }, [loadFileUploads]);

  // 데이터 초기화
  const handleClear = useCallback(async () => {
    if (confirm('모든 발주 내역을 초기화하시겠습니까?')) {
      const { success, error } = await removeAllOrders();
      if (success) {
        showNotification('모든 발주 내역이 삭제되었습니다.');
      } else if (error) {
        alert(`삭제 중 오류가 발생했습니다: ${error.message}`);
      }
    }
  }, [removeAllOrders, showNotification]);

  // 외주처별 주문 그룹화
  const vendorGroups = useMemo(() => {
    const groups: Record<string, { vendorId: string; vendorName: string; code: string; items: typeof orders }> = {};

    orders.forEach(order => {
      if (!order.vendor) return;

      const vendorName = order.vendor.name;
      if (!groups[vendorName]) {
        groups[vendorName] = {
          vendorId: order.vendor_id,
          vendorName,
          code: order.vendor.code,
          items: []
        };
      }
      groups[vendorName].items.push(order);
    });

    return Object.values(groups);
  }, [orders]);

  // 리포트 데이터 계산
  const reportData = useMemo(() => {
    // "9"로 시작하는 제품코드만 필터링
    const filteredOrders = orders.filter(o => o.product_code?.startsWith('9'));

    // 외주처별 수량 합계
    const vendorQuantities: Record<string, number> = {};

    filteredOrders.forEach(order => {
      if (!order.vendor) return;
      const vendorName = order.vendor.name;
      vendorQuantities[vendorName] = (vendorQuantities[vendorName] || 0) + order.quantity;
    });

    return vendorQuantities;
  }, [orders]);

  // 정렬된 리포트 외주처 목록 (달성률 기준 내림차순)
  const sortedReportVendors = useMemo(() => {
    return Object.keys(reportData).sort((a, b) => {
      const rateA = vendorTargetsMap[a] ? (reportData[a] / vendorTargetsMap[a]) * 100 : 0;
      const rateB = vendorTargetsMap[b] ? (reportData[b] / vendorTargetsMap[b]) * 100 : 0;
      return rateB - rateA;
    });
  }, [reportData, vendorTargetsMap]);

  // 전체 합계
  const totalQuantity = useMemo(() => {
    return (Object.values(reportData) as number[]).reduce((a, b) => a + b, 0);
  }, [reportData]);

  const totalTarget = useMemo(() => {
    return (Object.values(vendorTargetsMap) as number[]).reduce((a, b) => a + b, 0);
  }, [vendorTargetsMap]);

  const totalAchievementRate = totalTarget > 0 ? (totalQuantity / totalTarget) * 100 : 0;

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  // 로딩 상태
  const isLoading = ordersLoading || vendorsLoading;

  // admin 여부 확인
  const isAdmin = dbUser.role === 'admin';

  return (
    <div className="max-w-3xl mx-auto w-full pb-20">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pt-6 px-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">COSMAX 관리자</h1>
          <p className="text-slate-500 text-xs sm:text-sm truncate max-w-[200px] sm:max-w-none">안녕하세요, {dbUser.name || dbUser.email}님</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {orders.length > 0 && (
            <button
              onClick={handleClear}
              className="text-slate-500 text-xs sm:text-sm font-medium hover:text-red-600 px-2 sm:px-3 py-1 bg-slate-100 rounded-lg transition-colors"
            >
              초기화
            </button>
          )}
          <button
            onClick={onLogout}
            className="text-slate-500 text-xs sm:text-sm font-medium hover:text-slate-900 px-2 sm:px-3 py-1 border border-slate-200 rounded-lg"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="flex px-4 mb-6 border-b border-slate-200 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('input')}
          className={`flex-1 min-w-fit pb-3 px-2 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'input' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          등록
          {activeTab === 'input' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 min-w-fit pb-3 px-2 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'list' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          목록 ({vendorGroups.length})
          {activeTab === 'list' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 min-w-fit pb-3 px-2 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'schedule' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          생산계획
          {activeTab === 'schedule' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`flex-1 min-w-fit pb-3 px-2 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'report' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          리포트
          {activeTab === 'report' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 min-w-fit pb-3 px-2 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeTab === 'users' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            사용자
            {activeTab === 'users' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
          </button>
        )}
      </div>

      {/* 알림 */}
      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-slate-800/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-xl z-50 text-sm font-medium animate-fade-in-down whitespace-nowrap">
          {notification}
        </div>
      )}

      {/* 콘텐츠 */}
      <div className="px-4">
        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* 에러 상태 */}
        {(ordersError || vendorsError) && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            <p className="font-medium">데이터를 불러오는 중 오류가 발생했습니다.</p>
            <p className="text-sm mt-1">{ordersError?.message || vendorsError?.message}</p>
            <button
              onClick={refetchOrders}
              className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 발주 등록 탭 */}
        {activeTab === 'input' && !isLoading && !ordersError && !vendorsError && (
          <div className="space-y-6">
            <FileUpload
              vendors={vendors}
              userId={dbUser.id}
              onUploadComplete={async (orders, fileName, orderDate) => {
                await handleUploadComplete(orders, fileName, orderDate);
                loadFileUploads(); // 업로드 후 리스트 갱신
              }}
            />

            {/* 업로드 파일 리스트 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-800">업로드 이력</h3>
              </div>
              
              {fileUploadsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : fileUploads.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  업로드된 파일이 없습니다.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {fileUploads.map((upload) => (
                    <div key={upload.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-800 truncate max-w-[200px]">
                              {upload.file_name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {new Date(upload.created_at).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-blue-600">{upload.order_count}건</div>
                          <div className="text-xs text-slate-400">발주일: {upload.order_date}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 발주 목록 탭 */}
        {activeTab === 'list' && !isLoading && !ordersError && (
          <div className="space-y-4">
            {vendorGroups.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900">데이터 없음</h3>
                <p className="text-slate-500 mt-1 text-sm">발주 파일을 업로드해주세요.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {vendorGroups.map((group) => (
                  <VendorCard
                    key={group.vendorName}
                    group={{
                      vendorName: group.vendorName,
                      code: group.code,
                      items: group.items.map(order => ({
                        id: order.id,
                        productName: order.product_name,
                        productCode: order.product_code || undefined,
                        quantity: String(order.quantity),
                        vendorName: group.vendorName,
                        orderDate: order.order_date,
                        isCompleted: order.is_completed
                      }))
                    }}
                    onOpenVendorView={() => onNavigateToVendor(group.vendorId, group.vendorName)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 생산계획표 탭 */}
        {activeTab === 'schedule' && !isLoading && !ordersError && (
          <div className="space-y-4">
            <ProductionGantt
              schedules={schedules}
              vendors={vendors}
              onScheduleMove={async (scheduleId, newStartDate, newEndDate) => {
                await moveSchedule(scheduleId, newStartDate, newEndDate);
                showNotification('생산계획이 변경되었습니다.');
              }}
              isLoading={schedulesLoading}
            />
          </div>
        )}

        {/* 발주 리포트 탭 */}
        {activeTab === 'report' && !isLoading && !ordersError && (
          <div className="space-y-4">
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
              <p className="text-sm text-slate-500 mb-4">제품코드 "9"로 시작하는 품목만 집계됩니다.</p>

              {targetsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : sortedReportVendors.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>집계할 데이터가 없습니다.</p>
                  <p className="text-xs mt-1">제품코드 "9"로 시작하는 발주가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 막대 그래프 */}
                  <div className="space-y-4">
                    {(() => {
                      // 일수 기준 예상 목표 위치 계산 (모든 업체 동일)
                      const today = new Date();
                      const currentDay = today.getDate();
                      const workingDays = 20;
                      const expectedPercent = (Math.min(currentDay, workingDays) / workingDays) * 100;
                      
                      return sortedReportVendors.map((vendorName, index) => {
                        const qty = reportData[vendorName];
                        const target = vendorTargetsMap[vendorName] || 0;
                        const achievementRate = target > 0 ? (qty / target) * 100 : 0;
                        const barWidth = Math.min(achievementRate, 100);
                        const color = colors[index % colors.length];
                        
                        // 일수 기준 진행 상태 계산
                        const expectedQty = target > 0 ? (target / workingDays) * Math.min(currentDay, workingDays) : 0;
                        const progressRatio = expectedQty > 0 ? qty / expectedQty : 0;
                        
                        const getStatus = () => {
                          if (target === 0) return null;
                          if (progressRatio <= 0.9) return { icon: '🔥', text: '서두르세요', color: 'text-red-500' };
                          if (progressRatio <= 1.1) return { icon: '👍', text: '좋아요', color: 'text-blue-500' };
                          return { icon: '🎉', text: '잘하고 있어요', color: 'text-emerald-500' };
                        };
                        const status = getStatus();

                        return (
                          <div key={vendorName} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-700">{vendorName}</span>
                                {status && (
                                  <span className={`text-xs font-medium ${status.color}`}>
                                    {status.icon} {status.text}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-slate-500">
                                <span className="font-bold" style={{ color }}>{achievementRate.toFixed(1)}%</span>
                                <span className="text-slate-400 ml-1">달성</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 relative">
                                {/* 일수 기준 예상 목표 수량 (점선 위) */}
                                {target > 0 && (
                                  <div 
                                    className="absolute -top-4 text-[10px] text-slate-500 font-medium whitespace-nowrap"
                                    style={{ left: `${expectedPercent}%`, transform: 'translateX(-50%)' }}
                                  >
                                    {Math.round(expectedQty).toLocaleString()}
                                  </div>
                                )}
                                {/* 막대 그래프 영역 */}
                                <div className="h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                                  {/* 실제 달성량 막대 */}
                                  <div
                                    className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                                    style={{ width: `${barWidth}%`, backgroundColor: color }}
                                  >
                                    {barWidth >= 20 && (
                                      <span className="text-white text-sm font-bold drop-shadow">
                                        {qty.toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  {barWidth < 20 && (
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-600 text-sm font-bold">
                                      {qty.toLocaleString()}
                                    </span>
                                  )}
                                  {/* 일수 기준 예상 목표 점선 */}
                                  {target > 0 && (
                                    <div
                                      className="absolute top-0 h-full border-r-2 border-dashed border-slate-400"
                                      style={{ left: `${expectedPercent}%` }}
                                    />
                                  )}
                                </div>
                              </div>
                              <div className="w-24 text-right text-xs text-slate-400 flex-shrink-0">
                                목표: {target > 0 ? target.toLocaleString() : '-'}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* 합계 */}
                  {(() => {
                    const today = new Date();
                    const currentDay = today.getDate();
                    const workingDays = 20;
                    const expectedPercent = (Math.min(currentDay, workingDays) / workingDays) * 100;
                    const totalExpectedQty = totalTarget > 0 ? (totalTarget / workingDays) * Math.min(currentDay, workingDays) : 0;
                    const totalProgressRatio = totalExpectedQty > 0 ? totalQuantity / totalExpectedQty : 0;
                    
                    const getTotalStatus = () => {
                      if (totalTarget === 0) return null;
                      if (totalProgressRatio <= 0.9) return { icon: '🔥', text: '서두르세요', color: 'text-red-500' };
                      if (totalProgressRatio <= 1.1) return { icon: '👍', text: '좋아요', color: 'text-blue-500' };
                      return { icon: '🎉', text: '잘하고 있어요', color: 'text-emerald-500' };
                    };
                    const totalStatus = getTotalStatus();

                    return (
                      <div className="pt-4 border-t-2 border-slate-300 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-slate-800">총 발주 수량</span>
                            {totalStatus && (
                              <span className={`text-xs font-medium ${totalStatus.color}`}>
                                {totalStatus.icon} {totalStatus.text}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-500">
                            <span className="font-bold text-blue-600">{totalAchievementRate.toFixed(1)}%</span>
                            <span className="text-slate-400 ml-1">달성</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 relative">
                            {/* 일수 기준 예상 목표 수량 (점선 위) */}
                            {totalTarget > 0 && (
                              <div 
                                className="absolute -top-4 text-[10px] text-slate-500 font-medium whitespace-nowrap"
                                style={{ left: `${expectedPercent}%`, transform: 'translateX(-50%)' }}
                              >
                                {Math.round(totalExpectedQty).toLocaleString()}
                              </div>
                            )}
                            {/* 막대 그래프 영역 */}
                            <div className="h-10 bg-slate-200 rounded-lg overflow-hidden relative">
                              <div
                                className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-3"
                                style={{ width: `${Math.min(totalAchievementRate, 100)}%`, backgroundColor: '#1E40AF' }}
                              >
                                {totalAchievementRate >= 15 && (
                                  <span className="text-white text-lg font-bold drop-shadow">
                                    {totalQuantity.toLocaleString()}
                                  </span>
                                )}
                              </div>
                              {totalAchievementRate < 15 && (
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 text-lg font-bold">
                                  {totalQuantity.toLocaleString()}
                                </span>
                              )}
                              {/* 일수 기준 예상 목표 점선 */}
                              {totalTarget > 0 && (
                                <div
                                  className="absolute top-0 h-full border-r-2 border-dashed border-slate-400"
                                  style={{ left: `${expectedPercent}%` }}
                                />
                              )}
                            </div>
                          </div>
                          <div className="w-24 text-right text-xs text-slate-500 flex-shrink-0 font-medium">
                            목표: {totalTarget.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 사용자 관리 탭 (admin 전용) */}
        {activeTab === 'users' && isAdmin && (
          <UserManagement />
        )}
      </div>
    </div>
  );
};
