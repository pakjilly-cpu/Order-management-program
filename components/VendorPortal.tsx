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
        <div>
          {vendorItems.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <svg className="w-12 h-12 mb-3 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-8-2h2v-4h4v-2h-4V7h-2v4H7v2h4z"/></svg>
                <p>배정된 발주 내역이 없습니다.</p>
             </div>
          ) : isVendorMode ? (
            /* 외주처 모드 - 표 형식 + 체크박스 */
            <div className="space-y-3">
              {/* 전체 체크 버튼 */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    const allCompleted = vendorItems.every(item => item.isCompleted);
                    const itemsToToggle = allCompleted
                      ? vendorItems.filter(item => item.isCompleted)
                      : vendorItems.filter(item => !item.isCompleted);
                    itemsToToggle.forEach(item => onToggleItem(item.id));
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    vendorItems.every(item => item.isCompleted)
                      ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {vendorItems.every(item => item.isCompleted) ? (
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

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold text-slate-600 w-12">확인</th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-600">발주일</th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-600">품목</th>
                    <th className="px-3 py-3 text-left font-semibold text-slate-600">품명</th>
                    <th className="px-3 py-3 text-right font-semibold text-slate-600">수량</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendorItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => onToggleItem(item.id)}
                      className={`cursor-pointer transition-colors ${
                        item.isCompleted ? 'bg-slate-50' : 'hover:bg-blue-50'
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
                          ${item.isCompleted
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-slate-300 bg-white'
                          }`}
                        >
                          {item.isCompleted && (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className={`px-3 py-3 font-medium whitespace-nowrap ${
                        item.isCompleted ? 'text-slate-400' : 'text-blue-600'
                      }`}>
                        {item.orderDate || '-'}
                      </td>
                      <td className={`px-3 py-3 font-mono text-xs whitespace-nowrap ${
                        item.isCompleted ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {item.productCode || '-'}
                      </td>
                      <td className={`px-3 py-3 font-medium ${
                        item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'
                      }`}>
                        {item.productName}
                      </td>
                      <td className={`px-3 py-3 text-right font-bold whitespace-nowrap ${
                        item.isCompleted ? 'text-slate-400' : 'text-blue-700'
                      }`}>
                        {(() => {
                          const numStr = (item.quantity || '').replace(/[^\d]/g, '');
                          const num = parseInt(numStr) || 0;
                          return num.toLocaleString();
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          ) : (
            /* 관리자 미리보기 모드 - 표 형식 */
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">발주일</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">품목</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">품명</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">수량</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendorItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-blue-600 font-medium whitespace-nowrap">
                        {item.orderDate || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs whitespace-nowrap">
                        {item.productCode || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {item.productName}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-700 font-bold whitespace-nowrap">
                        {(() => {
                          const numStr = (item.quantity || '').replace(/[^\d]/g, '');
                          const num = parseInt(numStr) || 0;
                          return num.toLocaleString();
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
