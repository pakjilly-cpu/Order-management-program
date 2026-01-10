/**
 * useUsers Hook
 * 사용자 관리를 위한 커스텀 훅
 */

import { useState, useCallback, useEffect } from 'react';
import type { User, UserUpdate, UserRole } from '@/types/database';
import {
  getUsers,
  getUserById,
  updateUser,
  toggleUserActive,
  updateUserRole,
  getAdminCount
} from '@/services/userService';

interface UseUsersOptions {
  autoFetch?: boolean;
}

interface UseUsersReturn {
  users: User[];
  isLoading: boolean;
  error: Error | null;
  fetchUsers: () => Promise<void>;
  findUserById: (id: string) => Promise<{ data: User | null; error: Error | null }>;
  editUser: (id: string, data: UserUpdate) => Promise<{ success: boolean; error: Error | null }>;
  toggleActive: (id: string) => Promise<{ success: boolean; error: Error | null }>;
  changeRole: (id: string, role: UserRole) => Promise<{ success: boolean; error: Error | null }>;
  checkAdminCount: () => Promise<{ count: number | null; error: Error | null }>;
  refetch: () => Promise<void>;
}

export const useUsers = (options: UseUsersOptions = {}): UseUsersReturn => {
  const { autoFetch = true } = options;

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await getUsers();

    if (fetchError) {
      setError(fetchError);
      setUsers([]);
    } else {
      setUsers(data || []);
    }

    setIsLoading(false);
  }, []);

  const findUserById = useCallback(async (id: string) => {
    return await getUserById(id);
  }, []);

  const editUser = useCallback(async (id: string, data: UserUpdate) => {
    const { data: updatedUser, error: updateError } = await updateUser(id, data);

    if (updateError) {
      return { success: false, error: updateError };
    }

    // 로컬 상태 업데이트
    if (updatedUser) {
      setUsers(prev => prev.map(user =>
        user.id === id ? updatedUser : user
      ));
    }

    return { success: true, error: null };
  }, []);

  const toggleActive = useCallback(async (id: string) => {
    const { data: updatedUser, error: toggleError } = await toggleUserActive(id);

    if (toggleError) {
      return { success: false, error: toggleError };
    }

    // 로컬 상태 업데이트
    if (updatedUser) {
      setUsers(prev => prev.map(user =>
        user.id === id ? updatedUser : user
      ));
    }

    return { success: true, error: null };
  }, []);

  const changeRole = useCallback(async (id: string, role: UserRole) => {
    // 마지막 관리자 보호
    if (role === 'user') {
      const { count, error: countError } = await checkAdminCount();
      if (countError) {
        return { success: false, error: countError };
      }
      if (count !== null && count <= 1) {
        return {
          success: false,
          error: new Error('마지막 관리자는 권한을 변경할 수 없습니다.')
        };
      }
    }

    const { data: updatedUser, error: updateError } = await updateUserRole(id, role);

    if (updateError) {
      return { success: false, error: updateError };
    }

    // 로컬 상태 업데이트
    if (updatedUser) {
      setUsers(prev => prev.map(user =>
        user.id === id ? updatedUser : user
      ));
    }

    return { success: true, error: null };
  }, []);

  const checkAdminCount = useCallback(async () => {
    const { data: count, error: countError } = await getAdminCount();
    return { count, error: countError };
  }, []);

  const refetch = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  // 초기 데이터 로드
  useEffect(() => {
    if (autoFetch) {
      fetchUsers();
    }
  }, [autoFetch, fetchUsers]);

  return {
    users,
    isLoading,
    error,
    fetchUsers,
    findUserById,
    editUser,
    toggleActive,
    changeRole,
    checkAdminCount,
    refetch
  };
};
