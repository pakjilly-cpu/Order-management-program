import React, { useMemo, useState } from 'react';
import { OrderItem } from '../types';

// 외주처별 월간 목표 수량
const VENDOR_TARGETS: Record<string, number> = {
  '그램': 480000,
  '디딤테크': 1600000,
  '리니어': 1600000,
  '메이코스': 1000000,
  '씨엘로': 1600000,
  '엠큐브': 1000000,
  '위드맘': 1600000
};

interface VendorPortalProps {
  vendorName: string;
  orders: OrderItem[];
  onToggleItem: (itemId: string) => void;
  onBack?: () => void; // Used for Admin preview back navigation
  onLogout?: () => void; // Used for Real Vendor logout
}

export const VendorPortal: React.FC<VendorPortalProps> = ({ vendorName, orders, onToggleItem, onBack, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'report'>('list');

  const vendorItems = useMemo(() =>
    orders.filter(o => o.vendorName === vendorName),
  [orders, vendorName]);

  const completedCount = vendorItems.filter(i => i.isCompleted).length;
  const progress = vendorItems.length > 0 ? (completedCount / vendorItems.length) * 100 : 0;

  // 관리자 모드(미리보기)인지 외주처 모드(실제 접속)인지 확인
  const isVendorMode = !onBack;

  // 발주 리포트용 데이터 (제품코드 "9"로 시작하는 것만)
  const reportData = useMemo(() => {
    const filtered = vendorItems.filter(o => o.productCode?.startsWith('9'));
    const totalQty = filtered.reduce((sum, o) => {
      const numStr = (o.quantity || '').replace(/[^\d]/g, '');
      return sum + (parseInt(numStr) || 0);
    }, 0);
    const target = VENDOR_TARGETS[vendorName] || 0;
    const achievementRate = target > 0 ? (totalQty / target) * 100 : 0;
    return { totalQty, target, achievementRate };
  }, [vendorItems, vendorName]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-4 shadow-sm transition-all">
        <div className="max-w-2xl mx-auto">
          {/* Header Controls */}
          <div className="flex justify-between items-center mb-4">
             {!isVendorMode ? (
               <button 
                  onClick={onBack}
                  className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
               >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  관리자 화면 복귀
               </button>
             ) : (
                <div className="flex w-full justify-between items-center">
                   <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full font-bold border border-green-100">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      보안 접속 중
                   </div>
                   <button onClick={onLogout} className="text-xs text-slate-400 hover:text-slate-600 underline">
                      로그아웃
                   </button>
               </div>
             )}
             
             {/* 외주처용 전화하기 버튼 */}
             {isVendorMode && (
                <a href="tel:01012345678" className="ml-2 text-sm text-blue-600 font-semibold flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg active:bg-blue-100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    문의
                </a>
             )}
          </div>

          <div className="flex justify-between items-end mt-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{vendorName}</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {new Date().toLocaleDateString('ko-KR')} 납품 요청서
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-3xl font-bold text-blue-600 tabular-nums">{completedCount}</span>
                <span className="text-slate-400 text-lg tabular-nums">/{vendorItems.length}</span>
              </div>
              <span className="text-xs text-slate-400 font-medium">체크 완료</span>
            </div>
          </div>
          
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

      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {/* 발주 리포트 탭 */}
        {activeTab === 'report' && isVendorMode ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })} 발주 리포트
            </h3>
            <p className="text-sm text-slate-500 mb-6">제품코드 "9"로 시작하는 품목만 집계됩니다.</p>

            {reportData.target === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>목표 수량이 설정되지 않았습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
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
                        backgroundColor: '#3B82F6'
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
              </div>
            )}
          </div>
        ) : (
        <div className="space-y-2">
          {vendorItems.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <svg className="w-12 h-12 mb-3 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-8-2h2v-4h4v-2h-4V7h-2v4H7v2h4z"/></svg>
                <p>배정된 발주 내역이 없습니다.</p>
             </div>
          ) : (
            vendorItems.map((item) =>
              isVendorMode ? (
                /* 외주처 모드 - 체크박스 있음 */
                <label
                  key={item.id}
                  className={`group relative flex items-center h-auto px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer select-none
                    ${item.isCompleted
                      ? 'bg-slate-50 border-slate-100'
                      : 'bg-white border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={item.isCompleted}
                    onChange={() => onToggleItem(item.id)}
                    className="peer sr-only"
                  />
                  <div className="flex items-center gap-3 w-full min-w-0">
                    {/* 체크박스 */}
                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0
                      ${item.isCompleted
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'border-slate-300 bg-white text-transparent group-active:scale-90'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>

                    {/* 품번 */}
                    {item.productCode && (
                      <span className={`text-xs flex-shrink-0 font-mono ${item.isCompleted ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.productCode}
                      </span>
                    )}

                    {/* 품명 */}
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-bold text-sm break-keep ${item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {item.productName}
                      </h3>
                    </div>

                    {/* 수량 */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold flex-shrink-0
                      ${item.isCompleted ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-700'}`}>
                      {item.quantity}
                    </span>

                    {/* 납기일 */}
                    {item.deliveryDate && (
                      <span className={`text-xs flex-shrink-0 ${item.isCompleted ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.deliveryDate}
                      </span>
                    )}
                  </div>
                </label>
              ) : (
                /* 관리자 미리보기 모드 - 체크박스 없음 */
                <div
                  key={item.id}
                  className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm"
                >
                  <div className="flex items-center gap-3 w-full min-w-0">
                    {/* 발주일 */}
                    {item.orderDate && (
                      <span className="text-xs text-blue-600 font-medium flex-shrink-0 bg-blue-50 px-2 py-0.5 rounded">
                        {item.orderDate}
                      </span>
                    )}

                    {/* 품번 */}
                    {item.productCode && (
                      <span className="text-xs text-slate-500 flex-shrink-0 font-mono">
                        {item.productCode}
                      </span>
                    )}

                    {/* 품명 */}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm break-keep text-slate-800">
                        {item.productName}
                      </h3>
                    </div>

                    {/* 수량 */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold flex-shrink-0 bg-blue-50 text-blue-700">
                      {item.quantity}
                    </span>

                    {/* 납기일 */}
                    {item.deliveryDate && (
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {item.deliveryDate}
                      </span>
                    )}
                  </div>
                </div>
              )
            )
          )}
        </div>
        )}
      </div>

      {/* Completion Toast */}
      {progress === 100 && vendorItems.length > 0 && (
          <div className="fixed bottom-8 left-0 right-0 px-6 flex justify-center z-50 pointer-events-none">
              <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl font-bold flex items-center gap-3 animate-bounce-in pointer-events-auto shadow-emerald-600/30">
                  <div className="bg-white/20 p-1 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
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
