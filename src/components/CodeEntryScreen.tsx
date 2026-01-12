import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { getVendorByCode } from '@/services/vendorService';

interface VendorData {
  id: string;
  name: string;
}

interface CodeEntryScreenProps {
  onCodeSubmit: (code: string, type: 'ADMIN' | 'VENDOR', vendorData?: VendorData) => void;
  onLogout: () => void;
  userName?: string | null;
  userEmail?: string;
}

export const CodeEntryScreen: React.FC<CodeEntryScreenProps> = ({
  onCodeSubmit,
  onLogout,
  userName,
  userEmail,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const trimmedCode = code.trim();

    // 숫자만 허용
    if (!/^\d+$/.test(trimmedCode)) {
      setError('숫자만 입력해주세요.');
      setIsSubmitting(false);
      return;
    }

    // 9자리: 관리자
    if (trimmedCode.length === 9) {
      onCodeSubmit(trimmedCode, 'ADMIN');
      return;
    }

    // 6자리: 외주업체 - Supabase에서 조회
    if (trimmedCode.length === 6) {
      const { data: vendor, error: vendorError } = await getVendorByCode(trimmedCode);
      
      if (vendorError || !vendor) {
        setError('등록되지 않은 업체번호입니다.');
        setIsSubmitting(false);
        return;
      }
      
      // vendor.id (UUID)와 vendor.name 전달
      onCodeSubmit(trimmedCode, 'VENDOR', { id: vendor.id, name: vendor.name });
      return;
    }

    // 그 외 길이
    setError('관리자는 사번(9자리), 외주업체는 업체번호(6자리)를 입력하세요.');
    setIsSubmitting(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // 숫자만 허용
    setCode(value);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          {/* 로고 */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-auto relative">
              <svg viewBox="0 0 100 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm w-full h-full">
                <g>
                  <path d="M50 4 L53 9 H47 Z" fill="#E60012" />
                  <path d="M50 9 V12" stroke="#E60012" strokeWidth="3" />
                  <circle cx="50" cy="30" r="20" stroke="#E60012" strokeWidth="6" />
                </g>
                <g>
                  <path d="M50 42 L53 47 H47 Z" fill="#E60012" />
                  <path d="M50 47 V50" stroke="#E60012" strokeWidth="3" />
                  <circle cx="50" cy="68" r="20" stroke="#E60012" strokeWidth="6" />
                </g>
                <g>
                  <path d="M50 80 L53 85 H47 Z" fill="#E60012" />
                  <path d="M50 85 V88" stroke="#E60012" strokeWidth="3" />
                  <circle cx="50" cy="106" r="20" stroke="#E60012" strokeWidth="6" />
                </g>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">COSMAX</h1>
          <p className="text-slate-500 mt-2 text-sm">코드를 입력하세요</p>
        </div>

        {/* 로그인 정보 */}
        {(userName || userEmail) && (
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-slate-500">로그인 계정</p>
            <p className="text-slate-700 font-medium">{userName || userEmail}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-2">
              사번 또는 업체번호
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={handleInputChange}
              placeholder="관리자(9자리) / 외주업체(6자리)"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-center text-lg tracking-widest"
              maxLength={9}
              autoFocus
            />
            <p className="mt-2 text-xs text-slate-400 text-center">
              {code.length > 0 && `${code.length}자리 입력됨`}
            </p>
          </div>

          <Button
            type="submit"
            className="w-full py-3.5 text-base"
            isLoading={isSubmitting}
            disabled={isSubmitting || code.length < 6}
          >
            확인
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <button
            onClick={onLogout}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors text-sm"
          >
            다른 계정으로 로그인
          </button>
        </div>

        <div className="mt-6">
          <p className="text-xs text-slate-400 text-center">
            관리자는 사번(9자리)을 입력하세요.
            <br />
            외주업체는 업체번호(6자리)를 입력하세요.
          </p>
        </div>
      </div>
    </div>
  );
};
