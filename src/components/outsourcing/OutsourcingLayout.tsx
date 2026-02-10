import React, { useState } from 'react';
import { POConfirmation } from './pages/POConfirmation';
import { BOMStatus } from './pages/BOMStatus';
import { DeliveryCreate } from './pages/DeliveryCreate';
import { DeliveryPrint } from './pages/DeliveryPrint';
import { MaterialSettlement } from './pages/MaterialSettlement';
import { MaterialReturn } from './pages/MaterialReturn';

export type OutsourcingMenuId =
  | 'po-confirmation'
  | 'bom-status'
  | 'delivery-create'
  | 'delivery-print'
  | 'material-settlement'
  | 'material-return';

interface MenuItem {
  id: OutsourcingMenuId;
  label: string;
  shortLabel: string;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'po-confirmation', label: '발주서확인 및 변경요청', shortLabel: '발주서' },
  { id: 'bom-status', label: 'BOM 입고현황', shortLabel: 'BOM' },
  { id: 'delivery-create', label: '납품서 작성', shortLabel: '납품작성' },
  { id: 'delivery-print', label: '납품서 출력', shortLabel: '납품출력' },
  { id: 'material-settlement', label: '자재정산', shortLabel: '자재정산' },
  { id: 'material-return', label: '자재환입', shortLabel: '자재환입' },
];

interface OutsourcingLayoutProps {
  vendorId?: string;
  vendorCode?: string;
  isAdmin?: boolean;
  onBack: () => void;
}

export const OutsourcingLayout: React.FC<OutsourcingLayoutProps> = ({
  vendorId,
  vendorCode,
  isAdmin = false,
  onBack,
}) => {
  const [activeMenu, setActiveMenu] = useState<OutsourcingMenuId>('po-confirmation');

  const activeItem = MENU_ITEMS.find(m => m.id === activeMenu)!;

  const renderContent = () => {
    const props = { vendorId, vendorCode, isAdmin };
    switch (activeMenu) {
      case 'po-confirmation':
        return <POConfirmation vendorId={vendorId} vendorCode={vendorCode} />;
      case 'bom-status':
        return <BOMStatus {...props} />;
      case 'delivery-create':
        return <DeliveryCreate {...props} />;
      case 'delivery-print':
        return <DeliveryPrint {...props} />;
      case 'material-settlement':
        return <MaterialSettlement {...props} />;
      case 'material-return':
        return <MaterialReturn {...props} />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full pb-20">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3 pt-6 px-4 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="text-slate-500 hover:text-slate-800 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 border border-slate-200 rounded-lg transition-colors"
          >
            ← 돌아가기
          </button>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-[#8B1A1A]">외주임가공</h1>
          </div>
        </div>
        {vendorCode && (
          <span className="text-xs text-slate-500">
            협력사: <span className="font-mono font-semibold text-slate-700">{vendorCode}</span>
          </span>
        )}
      </div>

      {/* 메뉴 탭 - 가로 스크롤 */}
      <div className="flex px-4 mb-4 border-b border-slate-200 overflow-x-auto no-scrollbar">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveMenu(item.id)}
            className={`flex-shrink-0 pb-3 px-3 text-xs sm:text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeMenu === item.id
                ? 'text-[#8B1A1A]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="sm:hidden">{item.shortLabel}</span>
            <span className="hidden sm:inline">{item.label}</span>
            {activeMenu === item.id && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#8B1A1A] rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* 현재 메뉴 제목 (모바일에서 full label 표시) */}
      <div className="px-4 mb-3 sm:hidden">
        <p className="text-xs text-slate-400">
          외주임가공 &gt; <span className="text-slate-700 font-medium">{activeItem.label}</span>
        </p>
      </div>

      {/* 콘텐츠 */}
      <div className="px-4">
        {renderContent()}
      </div>
    </div>
  );
};
