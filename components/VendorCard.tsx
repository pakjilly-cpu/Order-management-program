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
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {group.vendorName}
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 font-mono">
               Code: {group.code}
            </span>
          </h3>
          <p className="text-sm text-slate-500 mt-1">총 {totalCount}개 품목</p>
        </div>
        <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-600 font-bold text-lg">
          {group.vendorName.charAt(0).toUpperCase()}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>{completedCount}개 완료</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1 text-sm py-2"
          onClick={onOpenVendorView}
        >
          미리보기
        </Button>
        <Button 
          variant="primary" 
          className="flex-shrink-0 bg-yellow-400 text-yellow-900 hover:bg-yellow-500 hover:text-white border-none"
          onClick={() => onShare(group.vendorName)}
          title="공유하기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 5.92 2 10.75c0 2.8 1.5 5.25 3.85 6.8-.1.75-.85 2.75-.95 2.95-.1.2.1.4.3.3.4-.15 2.85-1.9 3.35-2.25.5.1 1 .15 1.45.15 5.52 0 10-3.92 10-8.75S17.52 2 12 2z"/></svg>
        </Button>
      </div>
    </div>
  );
};
