import React, { useState } from 'react';

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
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'po-confirmation', label: '발주서확인 및 변경요청' },
  { id: 'bom-status', label: 'BOM 입고현황' },
  { id: 'delivery-create', label: '납품서 작성' },
  { id: 'delivery-print', label: '납품서 출력' },
  { id: 'material-settlement', label: '자재정산' },
  { id: 'material-return', label: '자재환입' },
];

interface OutsourcingSidebarProps {
  activeMenu: OutsourcingMenuId;
  onMenuChange: (menu: OutsourcingMenuId) => void;
}

export const OutsourcingSidebar: React.FC<OutsourcingSidebarProps> = ({
  activeMenu,
  onMenuChange,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`bg-slate-800 text-white flex-shrink-0 transition-all duration-200 ${
        collapsed ? 'w-0 overflow-hidden md:w-12' : 'w-48'
      }`}
    >
      <div className="bg-[#8B1A1A] px-4 py-3 flex items-center justify-between">
        {!collapsed && (
          <h2 className="text-sm font-bold tracking-wide">외주임가공</h2>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-white/70 hover:text-white text-xs hidden md:block"
          title={collapsed ? '펼치기' : '접기'}
        >
          {collapsed ? '\u25B6' : '\u25C0'}
        </button>
      </div>

      {!collapsed && (
        <nav className="py-1">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onMenuChange(item.id)}
              className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                activeMenu === item.id
                  ? 'bg-slate-700 text-white font-semibold border-l-2 border-[#8B1A1A]'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white border-l-2 border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </aside>
  );
};
