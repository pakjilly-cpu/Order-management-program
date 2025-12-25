import React, { useMemo } from 'react';
import { OrderItem } from '../types';

interface VendorPortalProps {
  vendorName: string;
  orders: OrderItem[];
  onToggleItem: (itemId: string) => void;
  onBack?: () => void; // Used for Admin preview back navigation
  onLogout?: () => void; // Used for Real Vendor logout
}

export const VendorPortal: React.FC<VendorPortalProps> = ({ vendorName, orders, onToggleItem, onBack, onLogout }) => {
  const vendorItems = useMemo(() => 
    orders.filter(o => o.vendorName === vendorName), 
  [orders, vendorName]);

  const completedCount = vendorItems.filter(i => i.isCompleted).length;
  const progress = vendorItems.length > 0 ? (completedCount / vendorItems.length) * 100 : 0;
  
  // 관리자 모드(미리보기)인지 외주처 모드(실제 접속)인지 확인
  const isVendorMode = !onBack;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-4 shadow-sm transition-all">
        <div className="max-w-md mx-auto">
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
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 pb-32">
        <div className="space-y-4">
          {vendorItems.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <svg className="w-12 h-12 mb-3 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-8-2h2v-4h4v-2h-4V7h-2v4H7v2h4z"/></svg>
                <p>배정된 발주 내역이 없습니다.</p>
             </div>
          ) : (
            vendorItems.map((item) => (
                <label 
                  key={item.id}
                  className={`group relative block p-5 rounded-2xl border transition-all duration-200 cursor-pointer select-none
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
                  
                  <div className="flex items-start gap-4">
                    {/* Large Checkbox for Mobile */}
                    <div className={`mt-1 h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0
                      ${item.isCompleted 
                        ? 'bg-blue-500 border-blue-500 text-white scale-110' 
                        : 'border-slate-300 bg-white text-transparent group-active:scale-90'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                       <h3 className={`text-lg font-bold leading-tight break-keep ${item.isCompleted ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-800'}`}>
                         {item.productName}
                       </h3>
                       
                       <div className="flex flex-wrap items-center gap-2 mt-3">
                         <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold shadow-sm ${item.isCompleted ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'}`}>
                           {item.quantity}
                         </span>
                         
                         {item.deliveryDate && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg font-medium border border-slate-200">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                {item.deliveryDate}
                            </span>
                         )}
                       </div>

                       {item.notes && (
                           <div className="mt-3 text-sm text-orange-800 bg-orange-50/80 p-3 rounded-xl border border-orange-100/50 flex items-start gap-2">
                             <svg className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                             <span className="leading-tight">{item.notes}</span>
                           </div>
                       )}
                    </div>
                  </div>
                </label>
            ))
          )}
        </div>
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
