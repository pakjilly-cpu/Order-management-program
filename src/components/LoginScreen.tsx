import React, { useState, useEffect } from 'react';
import { Button } from '@/components/Button';

// 인앱 브라우저 감지 함수
const isInAppBrowser = (): boolean => {
  const ua = navigator.userAgent || (navigator as { vendor?: string }).vendor || '';

  // 카카오톡
  if (/KAKAOTALK/i.test(ua)) return true;
  // 라인
  if (/Line\//i.test(ua)) return true;
  // 네이버 앱
  if (/NAVER/i.test(ua)) return true;
  // 인스타그램
  if (/Instagram/i.test(ua)) return true;
  // 페이스북
  if (/FBAN|FBAV/i.test(ua)) return true;
  // 일반 WebView (Android)
  if (/wv\)/.test(ua)) return true;

  return false;
};

interface LoginScreenProps {
  onGoogleLogin: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onGoogleLogin,
  isLoading = false,
  error = null,
}) => {
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setInAppBrowser(isInAppBrowser());
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openInExternalBrowser = () => {
    const currentUrl = window.location.href;

    // Android: intent 스킴으로 Chrome 열기 시도
    if (/android/i.test(navigator.userAgent)) {
      window.location.href = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      return;
    }

    // iOS 및 기타: URL 복사 안내
    copyToClipboard();
  };

  const handleGoogleLogin = async () => {
    setLocalError(null);
    setIsSubmitting(true);

    try {
      await onGoogleLogin();
      // 리디렉션 후 처리되므로 여기서는 로딩 상태 유지
    } catch (err) {
      setLocalError('Google 로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
      setIsSubmitting(false);
    }
  };

  const displayError = error || localError;
  const showLoading = isLoading || isSubmitting;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-10">
          {/* Custom Logo: Vertical Stack of 3 Interlinked Red Coins/Apples based on user image */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-auto relative">
              <svg viewBox="0 0 100 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm w-full h-full">
                {/* Top Coin */}
                <g>
                  {/* Stem */}
                  <path d="M50 4 L53 9 H47 Z" fill="#E60012" />
                  <path d="M50 9 V12" stroke="#E60012" strokeWidth="3" />
                  {/* Ring */}
                  <circle cx="50" cy="30" r="20" stroke="#E60012" strokeWidth="6" />
                </g>

                {/* Middle Coin (Stacked below) */}
                <g>
                  {/* Stem */}
                  <path d="M50 42 L53 47 H47 Z" fill="#E60012" />
                  <path d="M50 47 V50" stroke="#E60012" strokeWidth="3" />
                  {/* Ring */}
                  <circle cx="50" cy="68" r="20" stroke="#E60012" strokeWidth="6" />
                </g>

                {/* Bottom Coin (Stacked below) */}
                <g>
                  {/* Stem */}
                  <path d="M50 80 L53 85 H47 Z" fill="#E60012" />
                  <path d="M50 85 V88" stroke="#E60012" strokeWidth="3" />
                  {/* Ring */}
                  <circle cx="50" cy="106" r="20" stroke="#E60012" strokeWidth="6" />
                </g>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">COSMAX</h1>
          <p className="text-slate-500 mt-2 text-sm">스마트한 발주 관리 시스템</p>
        </div>

        <div className="space-y-6">
          {displayError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-600 text-center">{displayError}</p>
            </div>
          )}

          {inAppBrowser ? (
            // 인앱 브라우저 감지 시 안내 UI
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="flex items-start gap-3 mb-4">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800 mb-1">
                    앱 내 브라우저에서는 Google 로그인이 지원되지 않습니다
                  </p>
                  <p className="text-xs text-amber-700">
                    Chrome 또는 Safari에서 접속해주세요
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={openInExternalBrowser}
                  className="w-full py-3 text-sm !bg-amber-600 !text-white hover:!bg-amber-700 !border-0"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  외부 브라우저로 열기
                </Button>

                <Button
                  type="button"
                  onClick={copyToClipboard}
                  className="w-full py-3 text-sm !bg-white !text-amber-700 !border !border-amber-300 hover:!bg-amber-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copied ? 'URL이 복사되었습니다!' : 'URL 복사하기'}
                </Button>
              </div>

              <p className="text-xs text-amber-600 mt-4 text-center">
                복사한 URL을 Chrome 또는 Safari 주소창에 붙여넣기 하세요
              </p>
            </div>
          ) : (
            // 일반 브라우저: 기존 Google 로그인 버튼
            <Button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-3.5 text-base !bg-white !text-slate-700 !border !border-slate-300 hover:!bg-slate-50 !shadow-sm flex items-center justify-center gap-3"
              isLoading={showLoading}
              disabled={showLoading}
            >
              {!showLoading && (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Google 계정으로 로그인
            </Button>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400 text-center">
            회사 Google 계정으로 로그인하세요.
            <br />
            첫 로그인 시 관리자 승인이 필요할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};
