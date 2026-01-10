/**
 * AdminDashboard 컴포넌트
 * 관리자 대시보드 - Supabase 연동
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { User as DbUser, OrderInsert, Vendor } from '@/types/database';
import { User } from '@/types';
import { useOrders } from '@/hooks/useOrders';
import { useVendors, useVendorTargets } from '@/hooks/useVendors';
import { createFileUpload } from '@/services/fileUploadService';
import { FileUpload } from '@/components/FileUpload';
import { VendorCard } from '@/components/VendorCard';
import { UserManagement } from '@/components/UserManagement';
import { Button } from '@/components/Button';
import { parseOrdersWithGemini } from '@/services/geminiService';
import { v4 as uuidv4 } from 'uuid';

interface AdminDashboardProps {
  user: User;
  dbUser: DbUser;
  onNavigateToVendor: (vendorId: string, vendorName: string) => void;
  onLogout: () => void;
}

type TabType = 'input' | 'list' | 'report' | 'users';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  dbUser,
  onNavigateToVendor,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('input');
  const [notification, setNotification] = useState<string | null>(null);
  const [rawInput, setRawInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Supabase 훅
  const { orders, isLoading: ordersLoading, error: ordersError, addOrders, removeAllOrders, refetch: refetchOrders } = useOrders();
  const { vendors, isLoading: vendorsLoading, error: vendorsError } = useVendors();

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
  }, [addOrders, dbUser.id, showNotification]);

  // 텍스트 처리 (Gemini AI)
  const handleTextProcess = useCallback(async () => {
    if (!rawInput.trim()) return;

    setIsProcessing(true);
    try {
      const parsedItems = await parseOrdersWithGemini(rawInput, false);

      const today = new Date().toISOString().split('T')[0];
      const newOrders: OrderInsert[] = parsedItems.map(item => {
        // vendorName으로 vendor_id 찾기
        const vendor = vendors.find(v => v.name === item.vendorName);
        if (!vendor) {
          console.warn(`외주처를 찾을 수 없습니다: ${item.vendorName}`);
          return null;
        }

        const quantityStr = String(item.quantity || '').replace(/[^\d]/g, '');
        const quantity = parseInt(quantityStr) || 0;

        return {
          vendor_id: vendor.id,
          product_name: item.productName,
          product_code: item.productCode,
          quantity,
          order_date: today,
          uploaded_by: dbUser.id
        };
      }).filter((order): order is OrderInsert => order !== null);

      if (newOrders.length === 0) {
        throw new Error('유효한 발주 데이터를 찾을 수 없습니다.');
      }

      const { success, error } = await addOrders(newOrders);

      if (!success || error) {
        throw new Error(error?.message || '주문 저장에 실패했습니다.');
      }

      setRawInput('');
      setActiveTab('list');
      showNotification(`${newOrders.length}건의 발주가 등록되었습니다.`);
    } catch (error) {
      alert('처리 중 오류가 발생했습니다. 다시 시도해주세요.');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  }, [rawInput, vendors, dbUser.id, addOrders, showNotification]);

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
    return Object.values(reportData).reduce((a, b) => a + b, 0);
  }, [reportData]);

  const totalTarget = useMemo(() => {
    return Object.values(vendorTargetsMap).reduce((a, b) => a + b, 0);
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
      <div className="flex items-center justify-between mb-8 pt-6 px-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">COSMAX 관리자</h1>
          <p className="text-slate-500 text-sm">안녕하세요, {dbUser.name || dbUser.email}님</p>
        </div>
        <div className="flex gap-2">
          {orders.length > 0 && (
            <button
              onClick={handleClear}
              className="text-slate-500 text-sm font-medium hover:text-red-600 px-3 py-1 bg-slate-100 rounded-lg transition-colors"
            >
              데이터 초기화
            </button>
          )}
          <button
            onClick={onLogout}
            className="text-slate-500 text-sm font-medium hover:text-slate-900 px-3 py-1 border border-slate-200 rounded-lg"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="flex px-4 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('input')}
          className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
            activeTab === 'input' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          발주 등록
          {activeTab === 'input' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
            activeTab === 'list' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          발주목록 ({vendorGroups.length})
          {activeTab === 'list' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
            activeTab === 'report' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          발주 리포트
          {activeTab === 'report' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'users' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            사용자 관리
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
              onUploadComplete={handleUploadComplete}
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-50 px-2 text-slate-400 font-medium">또는 텍스트 직접 입력</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="텍스트로 발주 내용을 직접 입력하실 수도 있습니다."
                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
              />
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleTextProcess}
                  isLoading={isProcessing}
                  disabled={!rawInput.trim() || isProcessing}
                  variant="secondary"
                  className="text-sm"
                >
                  텍스트로 등록
                </Button>
              </div>
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
                    {sortedReportVendors.map((vendorName, index) => {
                      const qty = reportData[vendorName];
                      const target = vendorTargetsMap[vendorName] || 0;
                      const achievementRate = target > 0 ? (qty / target) * 100 : 0;
                      const barWidth = Math.min(achievementRate, 100);
                      const color = colors[index % colors.length];

                      return (
                        <div key={vendorName} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-slate-700">
                              {vendorName}
                            </div>
                            <div className="text-sm text-slate-500">
                              <span className="font-bold" style={{ color }}>{achievementRate.toFixed(1)}%</span>
                              <span className="text-slate-400 ml-1">달성</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
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
                            </div>
                            <div className="w-24 text-right text-xs text-slate-400 flex-shrink-0">
                              목표: {target > 0 ? target.toLocaleString() : '-'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 합계 */}
                  <div className="pt-4 border-t-2 border-slate-300 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-bold text-slate-800">
                        총 발주 수량
                      </div>
                      <div className="text-sm text-slate-500">
                        <span className="font-bold text-blue-600">{totalAchievementRate.toFixed(1)}%</span>
                        <span className="text-slate-400 ml-1">달성</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-10 bg-slate-200 rounded-lg overflow-hidden relative">
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
                      </div>
                      <div className="w-24 text-right text-xs text-slate-500 flex-shrink-0 font-medium">
                        목표: {totalTarget.toLocaleString()}
                      </div>
                    </div>
                  </div>
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
