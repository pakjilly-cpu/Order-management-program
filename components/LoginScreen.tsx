import React, { useState } from 'react';
import { Button } from './Button';

interface LoginScreenProps {
  onLogin: (code: string, rememberMe: boolean) => Promise<boolean>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [code, setCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // Default to true
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setError(null);
    setIsLoading(true);

    // Simulate network delay for better UX
    setTimeout(async () => {
        const success = await onLogin(code.trim(), rememberMe);
        if (!success) {
            if (code.length === 9) {
                 setError('등록되지 않은 관리자 사번입니다.');
            } else if (code.length === 6) {
                 setError('확인되지 않는 외주처 코드입니다.');
            } else {
                 setError('올바른 코드를 입력해주세요. (관리자 9자리, 외주처 6자리)');
            }
            setIsLoading(false);
        }
        // Success case handled by parent (view change)
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">매일발주</h1>
          <p className="text-slate-500 mt-2 text-sm">스마트한 발주 관리 시스템</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-2">
              접속 코드 입력
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => {
                  // Only allow numbers
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setCode(val);
                  setError(null);
              }}
              placeholder="사번(9자리) 또는 업체코드(6자리)"
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg tracking-widest text-center font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal placeholder:text-base"
              maxLength={9}
              inputMode="numeric"
            />
            {error && (
                <p className="mt-2 text-sm text-red-500 text-center animate-fade-in">{error}</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
            />
            <label htmlFor="remember-me" className="ml-2 text-sm font-medium text-slate-600 cursor-pointer select-none">
              자동 로그인
            </label>
          </div>

          <div className="space-y-3">
            <Button 
                type="submit" 
                className="w-full py-3.5 text-base" 
                isLoading={isLoading}
                disabled={!code || (code.length !== 6 && code.length !== 9)}
            >
                로그인
            </Button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
           <div className="flex justify-between text-xs text-slate-400">
              <span>외주처 예시 : 6자리 업체번호</span>
              <span>관리자 예시 : 9자리 사번</span>
           </div>
        </div>
      </div>
    </div>
  );
};