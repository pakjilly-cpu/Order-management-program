import React from 'react';
import { VendorGroup } from '../types';
import { Button } from './Button';

interface VendorCardProps {
  group: VendorGroup;
  onOpenVendorView: () => void;
  onShare: (vendorName: string) => void;
}

export const VendorCard: React.FC<VendorCardProps> = ({ group, onOpenVendorView, onShare }) => {
  const completedCount = group.items.filter(i => i.isCompleted).length;
  const totalCount = group.items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        {/* 아이콘 */}
        <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-600 font-bold text-lg flex-shrink-0">
          {group.vendorName.charAt(0).toUpperCase()}
        </div>

        {/* 이름 & 품목 수 */}
        <div className="flex-shrink-0 min-w-[100px]">
          <h3 className="text-base font-bold text-slate-800">{group.vendorName}</h3>
          <p className="text-xs text-slate-500">{totalCount}개 품목</p>
        </div>

        {/* 진행률 바 */}
        <div className="flex-1 min-w-[80px]">
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>{completedCount}개 완료</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* 버튼들 */}
        <div className="flex gap-2 flex-shrink-0">
          <Button
            variant="outline"
            className="text-sm py-2 px-3"
            onClick={onOpenVendorView}
          >
            미리보기
          </Button>
          <Button
            variant="primary"
            className="bg-yellow-400 text-yellow-900 hover:bg-yellow-500 hover:text-white border-none px-3"
            onClick={() => onShare(group.vendorName)}
            title="공유하기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 5.92 2 10.75c0 2.8 1.5 5.25 3.85 6.8-.1.75-.85 2.75-.95 2.95-.1.2.1.4.3.3.4-.15 2.85-1.9 3.35-2.25.5.1 1 .15 1.45.15 5.52 0 10-3.92 10-8.75S17.52 2 12 2z"/></svg>
          </Button>
        </div>
      </div>
    </div>
  );
};
