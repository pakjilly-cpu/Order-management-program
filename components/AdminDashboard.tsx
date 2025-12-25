import React, { useState, useRef } from 'react';
import { OrderItem, VendorGroup, User } from '../types';
import { parseOrdersWithGemini } from '../services/geminiService';
import { Button } from './Button';
import { VendorCard } from './VendorCard';
import { v4 as uuidv4 } from 'uuid';

interface AdminDashboardProps {
  user: User;
  orders: OrderItem[];
  setOrders: React.Dispatch<React.SetStateAction<OrderItem[]>>;
  vendorCodes: Record<string, string>; // VendorName -> Code (6 digits)
  setVendorCodes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onNavigateToVendor: (code: string) => void;
  onLogout: () => void;
}

// Predefined codes for specific vendors
const PREDEFINED_CODES: Record<string, string> = {
  '위드맘': '200131',
  '리니어': '200101'
};

const generateVendorCode = (existingCodes: Record<string, string>): string => {
  let code = '';
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (Object.values(existingCodes).includes(code) || Object.values(PREDEFINED_CODES).includes(code));
  return code;
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  user,
  orders, 
  setOrders, 
  vendorCodes,
  setVendorCodes,
  onNavigateToVendor,
  onLogout
}) => {
  const [rawInput, setRawInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'list'>('input');
  const [notification, setNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const processData = async (data: string, isImage: boolean) => {
    setIsProcessing(true);
    try {
      const parsedItems = await parseOrdersWithGemini(data, isImage);
      
      const newOrders: OrderItem[] = parsedItems.map(item => ({
        ...item,
        id: uuidv4(),
        isCompleted: false
      }));

      // Update codes for new vendors
      const newCodes = { ...vendorCodes };
      let codesUpdated = false;

      parsedItems.forEach(item => {
        if (!newCodes[item.vendorName]) {
          // Check predefined
          if (PREDEFINED_CODES[item.vendorName]) {
             newCodes[item.vendorName] = PREDEFINED_CODES[item.vendorName];
          } else {
             // Generate random 6 digit
             newCodes[item.vendorName] = generateVendorCode(newCodes);
          }
          codesUpdated = true;
        }
      });

      if (codesUpdated) {
        setVendorCodes(newCodes);
      }

      setOrders(prev => [...newOrders, ...prev]);
      setRawInput('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      setActiveTab('list');
      showNotification(`${parsedItems.length}건의 발주가 등록되었습니다.`);
    } catch (error) {
      alert("처리 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextProcess = () => {
    if (!rawInput.trim()) return;
    processData(rawInput, false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      processData(base64, true);
    };
    reader.readAsDataURL(file);
  };

  const handleShare = (vendorName: string) => {
    const code = vendorCodes[vendorName];
    if (!code) return;

    const url = `${window.location.origin}`;
    const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    const message = `[매일발주] ${today} 발주서가 도착했습니다.\n\n앱 접속: ${url}\n접속 코드: ${code}`;

    navigator.clipboard.writeText(message).then(() => {
      showNotification(`${vendorName} 접속 코드(${code})가 포함된 메시지가 복사되었습니다!`);
    });
  };

  const vendorGroups: VendorGroup[] = Object.values(orders.reduce((acc, order) => {
    if (!acc[order.vendorName]) {
      acc[order.vendorName] = {
        vendorName: order.vendorName,
        items: [],
        code: vendorCodes[order.vendorName] || '미지정'
      };
    }
    acc[order.vendorName].items.push(order);
    return acc;
  }, {} as Record<string, VendorGroup>));

  const handleClear = () => {
    if(confirm("모든 발주 내역을 초기화하시겠습니까?")) {
        setOrders([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full pb-20">
      <div className="flex items-center justify-between mb-8 pt-6 px-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">매일발주 관리자</h1>
          <p className="text-slate-500 text-sm">안녕하세요, {user.id}님</p>
        </div>
        <div className="flex gap-2">
            {orders.length > 0 && (
                <button onClick={handleClear} className="text-slate-500 text-sm font-medium hover:text-red-600 px-3 py-1 bg-slate-100 rounded-lg transition-colors">
                    데이터 초기화
                </button>
            )}
            <button onClick={onLogout} className="text-slate-500 text-sm font-medium hover:text-slate-900 px-3 py-1 border border-slate-200 rounded-lg">
                로그아웃
            </button>
        </div>
      </div>

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
          외주처 현황 ({vendorGroups.length})
          {activeTab === 'list' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
        </button>
      </div>

      {notification && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-slate-800/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-xl z-50 text-sm font-medium animate-fade-in-down whitespace-nowrap">
          {notification}
        </div>
      )}

      <div className="px-4">
        {activeTab === 'input' ? (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 bg-green-50 rounded-full text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3-3 3 3"/></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">엑셀 파일 캡처 업로드</h3>
              <p className="text-sm text-slate-500 mb-6">
                발주서 엑셀 파일을 캡처해서 올려주세요.<br/>
                AI가 외주처별로 분류하고 접속 코드를 생성합니다.
              </p>
              
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
                ref={fileInputRef}
                id="file-upload"
              />
              <label 
                htmlFor="file-upload"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold cursor-pointer transition-all active:scale-95
                  ${isProcessing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-green-600/20'}`}
              >
                {isProcessing ? '분석 중입니다...' : '이미지 선택하기'}
              </label>
            </div>

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
                 <Button onClick={handleTextProcess} isLoading={isProcessing} disabled={!rawInput.trim() || isProcessing} variant="secondary" className="text-sm">
                    텍스트로 등록
                 </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {vendorGroups.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900">데이터 없음</h3>
                <p className="text-slate-500 mt-1 text-sm">발주 파일을 업로드해주세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vendorGroups.map((group) => (
                  <div key={group.vendorName} className="relative">
                      <VendorCard 
                        group={group} 
                        onOpenVendorView={() => onNavigateToVendor(group.code)}
                        onShare={handleShare}
                      />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
