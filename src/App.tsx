import React, { useState } from 'react';
import { AuthProvider } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { AdminDashboard } from '@/components/AdminDashboard';
import { VendorPortal } from '@/components/VendorPortal';
import { LoginScreen } from '@/components/LoginScreen';
import { User } from '@/types';

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

  // Preview vendor state (관리자가 외주처 포털 미리보기)
  const [previewVendor, setPreviewVendor] = useState<{ vendorId: string; vendorName: string } | null>(null);

  // --- Render Logic ---

  // 로딩 상태
  if (isLoading) {
    return <LoadingScreen />;
  }

  // 비인증 상태 - 로그인 화면
  if (!isAuthenticated || !user) {
    return (
      <LoginScreen
        onGoogleLogin={signInWithGoogle}
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
        onLogout={signOut}
      />
    );
  }

  // DB User를 기존 User 타입으로 변환 (기존 컴포넌트와 호환성 유지)
  const legacyUser: User = {
    type: user.role === 'admin' ? 'ADMIN' : 'VENDOR',
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

  // Admin 또는 일반 사용자 - 대시보드 표시
  return (
    <AdminDashboard
      user={legacyUser}
      dbUser={user}
      onNavigateToVendor={(vendorId, vendorName) => setPreviewVendor({ vendorId, vendorName })}
      onLogout={signOut}
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
