/**
 * User Service
 * 사용자 관련 CRUD 서비스
 */

import { supabase } from '@/lib/supabase';
import type { User, UserUpdate, UserRole } from '@/types/database';

/**
 * 전체 사용자 목록 조회
 */
export const getUsers = async (): Promise<{ data: User[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data as User[], error: null };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * ID로 사용자 조회
 * @param id 사용자 UUID
 */
export const getUserById = async (
  id: string
): Promise<{ data: User | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data: data as User, error: null };
  } catch (error) {
    console.error('Error fetching user by id:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * 사용자 정보 수정
 * @param id 사용자 UUID
 * @param updateData 수정할 데이터
 */
export const updateUser = async (
  id: string,
  updateData: UserUpdate
): Promise<{ data: User | null; error: Error | null }> => {
  try {
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: updatedUser as User, error: null };
  } catch (error) {
    console.error('Error updating user:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * 사용자 활성화/비활성화 토글
 * @param id 사용자 UUID
 */
export const toggleUserActive = async (
  id: string
): Promise<{ data: User | null; error: Error | null }> => {
  try {
    // 먼저 현재 상태 조회
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!currentUser) throw new Error('User not found');

    const current = currentUser as { is_active: boolean };

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        is_active: !current.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    return { data: updatedUser as User, error: null };
  } catch (error) {
    console.error('Error toggling user active status:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * 사용자 권한 변경
 * @param id 사용자 UUID
 * @param role 새로운 권한 ('admin' | 'user')
 */
export const updateUserRole = async (
  id: string,
  role: UserRole
): Promise<{ data: User | null; error: Error | null }> => {
  try {
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: updatedUser as User, error: null };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * 관리자 수 조회 (마지막 관리자 보호용)
 */
export const getAdminCount = async (): Promise<{ data: number | null; error: Error | null }> => {
  try {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_active', true);

    if (error) throw error;
    return { data: count, error: null };
  } catch (error) {
    console.error('Error counting admins:', error);
    return { data: null, error: error as Error };
  }
};
