import React, { useState, useEffect } from 'react';
import { AuthProvider } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { AdminDashboard } from '@/components/AdminDashboard';
import { VendorPortal } from '@/components/VendorPortal';
import { LoginScreen } from '@/components/LoginScreen';
import { CodeEntryScreen } from '@/components/CodeEntryScreen';
import { User } from '@/types';

// 세션 스토리지 키
const SESSION_CODE_KEY = 'user_code';
const SESSION_TYPE_KEY = 'user_type';
const SESSION_LOGIN_FLAG = 'login_initiated';
const SESSION_VENDOR_ID_KEY = 'vendor_id';
const SESSION_VENDOR_NAME_KEY = 'vendor_name';

// ============================================
// 승인 대기 화면 컴포넌트
// ============================================

interface PendingApprovalScreenProps {
  userName: string | null;
  userEmail: string;
  onLogout: () => void;
}

const PendingApprovalScreen: React.FC<PendingApprovalScreenProps> = ({
  userName,
  userEmail,
  onLogout,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-2">승인 대기 중</h1>
        <p className="text-slate-600 mb-6">
          {userName ? `${userName}님, ` : ''}관리자의 승인을 기다리고 있습니다.
          <br />
          승인 후 시스템을 사용할 수 있습니다.
        </p>

        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-slate-500">로그인 계정</p>
          <p className="text-slate-700 font-medium">{userEmail}</p>
        </div>

        <button
          onClick={onLogout}
          className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
};

// ============================================
// 로딩 화면 컴포넌트
// ============================================

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">로딩 중...</p>
      </div>
    </div>
  );
};

// ============================================
// Main App Content (Auth Context 내부에서 사용)
// ============================================

const AppContent: React.FC = () => {
  const { user, isLoading, isAuthenticated, signInWithGoogle, signOut } = useAuth();

  // 코드 입력 상태
  const [userCode, setUserCode] = useState<string | null>(null);
  const [userType, setUserType] = useState<'ADMIN' | 'VENDOR' | null>(null);
  // Vendor 정보 (UUID, 이름) - 외주업체 로그인 시 사용
  const [vendorData, setVendorData] = useState<{ id: string; name: string } | null>(null);

  // Preview vendor state (관리자가 외주처 포털 미리보기)
  const [previewVendor, setPreviewVendor] = useState<{ vendorId: string; vendorName: string } | null>(null);

  // Google 로그인 핸들러 (코드 초기화 후 로그인)
  const handleGoogleLogin = async () => {
    // 로그인 플래그 설정 - OAuth 리다이렉트 후 코드 복원 방지
    sessionStorage.setItem(SESSION_LOGIN_FLAG, 'true');
    setUserCode(null);
    setUserType(null);
    await signInWithGoogle();
  };

  // 세션에서 코드 복원 (OAuth 리다이렉트 후에는 복원하지 않음)
  useEffect(() => {
    const loginFlag = sessionStorage.getItem(SESSION_LOGIN_FLAG);
    
    if (loginFlag) {
      // OAuth 리다이렉트 후 - 플래그 제거하고 코드도 초기화
      sessionStorage.removeItem(SESSION_LOGIN_FLAG);
      sessionStorage.removeItem(SESSION_CODE_KEY);
      sessionStorage.removeItem(SESSION_TYPE_KEY);
      sessionStorage.removeItem(SESSION_VENDOR_ID_KEY);
      sessionStorage.removeItem(SESSION_VENDOR_NAME_KEY);
      return;
    }
    
    // 일반 새로고침 - 코드 복원
    const savedCode = sessionStorage.getItem(SESSION_CODE_KEY);
    const savedType = sessionStorage.getItem(SESSION_TYPE_KEY) as 'ADMIN' | 'VENDOR' | null;
    const savedVendorId = sessionStorage.getItem(SESSION_VENDOR_ID_KEY);
    const savedVendorName = sessionStorage.getItem(SESSION_VENDOR_NAME_KEY);
    
    if (savedCode && savedType) {
      setUserCode(savedCode);
      setUserType(savedType);
      
      // Vendor 정보 복원
      if (savedType === 'VENDOR' && savedVendorId && savedVendorName) {
        setVendorData({ id: savedVendorId, name: savedVendorName });
      }
    }
  }, []);

  // 코드 제출 핸들러
  const handleCodeSubmit = (code: string, type: 'ADMIN' | 'VENDOR', vendorInfo?: { id: string; name: string }) => {
    setUserCode(code);
    setUserType(type);
    sessionStorage.setItem(SESSION_CODE_KEY, code);
    sessionStorage.setItem(SESSION_TYPE_KEY, type);
    
    // Vendor 정보 저장
    if (type === 'VENDOR' && vendorInfo) {
      setVendorData(vendorInfo);
      sessionStorage.setItem(SESSION_VENDOR_ID_KEY, vendorInfo.id);
      sessionStorage.setItem(SESSION_VENDOR_NAME_KEY, vendorInfo.name);
    }
  };

  // 로그아웃 핸들러 (코드도 초기화)
  const handleLogout = async () => {
    setUserCode(null);
    setUserType(null);
    setVendorData(null);
    sessionStorage.removeItem(SESSION_CODE_KEY);
    sessionStorage.removeItem(SESSION_TYPE_KEY);
    sessionStorage.removeItem(SESSION_VENDOR_ID_KEY);
    sessionStorage.removeItem(SESSION_VENDOR_NAME_KEY);
    await signOut();
  };

  // --- Render Logic ---

  // 로딩 상태
  if (isLoading) {
    return <LoadingScreen />;
  }

  // 비인증 상태 - 로그인 화면
  if (!isAuthenticated || !user) {
    return (
      <LoginScreen
        onGoogleLogin={handleGoogleLogin}
        isLoading={isLoading}
      />
    );
  }

  // 비활성화된 사용자 - 승인 대기 화면
  if (!user.is_active) {
    return (
      <PendingApprovalScreen
        userName={user.name}
        userEmail={user.email}
        onLogout={handleLogout}
      />
    );
  }

  // 코드 미입력 상태 - 코드 입력 화면
  if (!userCode || !userType) {
    return (
      <CodeEntryScreen
        onCodeSubmit={handleCodeSubmit}
        onLogout={handleLogout}
        userName={user.name}
        userEmail={user.email}
      />
    );
  }

  // DB User를 기존 User 타입으로 변환 (코드 입력에 따른 타입 사용)
  const legacyUser: User = {
    type: userType,
    id: user.id,
    name: user.name ?? user.email,
  };

  // 관리자가 외주처 포털 미리보기 중
  if (previewVendor) {
    return (
      <VendorPortal
        vendorId={previewVendor.vendorId}
        vendorName={previewVendor.vendorName}
        onBack={() => setPreviewVendor(null)}
      />
    );
  }

  // 외주업체로 로그인한 경우 - VendorPortal 표시
  if (userType === 'VENDOR' && vendorData) {
    return (
      <VendorPortal
        vendorId={vendorData.id}
        vendorName={vendorData.name}
        onLogout={handleLogout}
      />
    );
  }

  // Admin - 대시보드 표시
  return (
    <AdminDashboard
      user={legacyUser}
      dbUser={user}
      onNavigateToVendor={(vendorId, vendorName) => setPreviewVendor({ vendorId, vendorName })}
      onLogout={handleLogout}
    />
  );
};

// ============================================
// App Component (AuthProvider로 래핑)
// ============================================

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
