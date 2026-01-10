import React, { createContext, useEffect, useState, useCallback } from 'react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// ============================================
// Auth Context Types
// ============================================

export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: DbUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

// ============================================
// Auth Context
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// Auth Provider
// ============================================

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<DbUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Supabase Auth 사용자를 users 테이블과 동기화
   */
  const syncUserProfile = useCallback(async (session: Session | null): Promise<DbUser | null> => {
    console.log('syncUserProfile 시작');
    if (!session?.user) {
      console.log('세션에 user 없음');
      return null;
    }

    const authUser = session.user;
    console.log('authUser.id:', authUser.id);

    try {
      // 먼저 기존 사용자 정보 조회
      console.log('users 테이블에서 조회 시작');
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      console.log('조회 결과:', { existingUser, fetchError });

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', fetchError);
        return null;
      }

      if (existingUser) {
        console.log('기존 사용자 발견, 반환');
        return existingUser as DbUser;
      }

      // 신규 사용자: users 테이블에 레코드 생성
      console.log('신규 사용자, INSERT 시도');
      const { data: createdUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: authUser.email ?? '',
          name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
          avatar_url: authUser.user_metadata?.avatar_url ?? authUser.user_metadata?.picture ?? null,
          role: 'user',
          is_active: false,
        })
        .select()
        .single();

      console.log('INSERT 결과:', { createdUser, insertError });

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        return null;
      }

      return createdUser as DbUser;
    } catch (error) {
      console.error('syncUserProfile 에러:', error);
      return null;
    }
  }, []);

  /**
   * 세션 상태 초기화 및 변경 감지
   */
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      console.log('initializeAuth 시작');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('세션 확인:', session ? '있음' : '없음');

        if (session && isMounted) {
          console.log('syncUserProfile 호출');
          const userProfile = await syncUserProfile(session);
          console.log('userProfile 결과:', userProfile);
          if (isMounted) {
            setUser(userProfile);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (isMounted) {
          console.log('로딩 해제');
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('Auth state changed:', event);

        // SIGNED_OUT만 처리, 나머지는 initializeAuth에서 처리됨
        if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setUser(null);
            setIsLoading(false);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [syncUserProfile]);

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}`,
      },
    });
    if (error) {
      console.error('Error signing in with Google:', error);
      setIsLoading(false);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      setIsLoading(false);
      throw error;
    }
    setUser(null);
    setIsLoading(false);
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
