import React from 'react';
import { VendorGroup } from '@/types';
import { Button } from '@/components/Button';

interface VendorCardProps {
  group: VendorGroup;
  onOpenVendorView: () => void;
}

export const VendorCard: React.FC<VendorCardProps> = ({ group, onOpenVendorView }) => {
  const completedCount = group.items.filter(i => i.isCompleted).length;
  const totalCount = group.items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      {/* 모바일: 세로 레이아웃 */}
      <div className="sm:hidden">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-600 font-bold text-lg flex-shrink-0">
            {group.vendorName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-800 truncate">{group.vendorName}</h3>
            <p className="text-xs text-slate-500">{totalCount}개 품목 · {completedCount}개 완료</p>
          </div>
          <Button
            variant="outline"
            className="text-xs py-1.5 px-2 flex-shrink-0"
            onClick={onOpenVendorView}
          >
            보기
          </Button>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 데스크톱: 가로 레이아웃 */}
      <div className="hidden sm:flex items-center gap-4">
        <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-600 font-bold text-lg flex-shrink-0">
          {group.vendorName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-shrink-0 min-w-[100px]">
          <h3 className="text-base font-bold text-slate-800">{group.vendorName}</h3>
          <p className="text-xs text-slate-500">{totalCount}개 품목</p>
        </div>
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
        <div className="flex-shrink-0">
          <Button
            variant="outline"
            className="text-sm py-2 px-3"
            onClick={onOpenVendorView}
          >
            발주품목
          </Button>
        </div>
      </div>
    </div>
  );
};
