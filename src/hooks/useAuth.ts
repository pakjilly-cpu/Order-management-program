import { useContext } from 'react';
import { AuthContext, AuthContextType } from '@/lib/auth';

/**
 * Auth Context를 쉽게 사용할 수 있는 커스텀 훅
 *
 * @example
 * ```tsx
 * const { user, isLoading, isAuthenticated, signInWithGoogle, signOut } = useAuth();
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (!isAuthenticated) return <LoginScreen />;
 *
 * return <Dashboard user={user} onLogout={signOut} />;
 * ```
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
