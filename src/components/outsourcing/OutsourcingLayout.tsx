import React, { useState } from 'react';
import { OutsourcingSidebar, OutsourcingMenuId } from './shared/OutsourcingSidebar';
import { POConfirmation } from './pages/POConfirmation';
import { BOMStatus } from './pages/BOMStatus';
import { DeliveryCreate } from './pages/DeliveryCreate';
import { DeliveryPrint } from './pages/DeliveryPrint';
import { MaterialSettlement } from './pages/MaterialSettlement';
import { MaterialReturn } from './pages/MaterialReturn';

interface OutsourcingLayoutProps {
  vendorId?: string;
  vendorCode?: string;
  onBack: () => void;
}

export const OutsourcingLayout: React.FC<OutsourcingLayoutProps> = ({
  vendorId,
  vendorCode,
  onBack,
}) => {
  const [activeMenu, setActiveMenu] = useState<OutsourcingMenuId>('po-confirmation');

  const menuTitleMap: Record<OutsourcingMenuId, string> = {
    'po-confirmation': '발주서확인 및 변경요청',
    'bom-status': 'BOM 입고현황',
    'delivery-create': '납품서 작성',
    'delivery-print': '납품서 출력',
    'material-settlement': '자재정산',
    'material-return': '자재환입',
  };

  const renderContent = () => {
    const props = { vendorId, vendorCode };
    switch (activeMenu) {
      case 'po-confirmation':
        return <POConfirmation {...props} />;
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
    <div className="flex h-screen bg-slate-100">
      <OutsourcingSidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
            >
              ← 관리자 화면
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <nav className="text-xs text-slate-400">
              외주임가공 &gt; <span className="text-slate-700 font-medium">{menuTitleMap[activeMenu]}</span>
            </nav>
          </div>
          {vendorCode && (
            <span className="text-xs text-slate-500">
              협력사 코드: <span className="font-mono font-semibold text-slate-700">{vendorCode}</span>
            </span>
          )}
        </header>

        <main className="flex-1 overflow-auto p-4">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
