/**
 * File Upload Service
 * 파일 업로드 이력 관련 CRUD 서비스
 */

import { supabase } from '@/lib/supabase';
import type { FileUpload, FileUploadInsert, FileUploadWithUser } from '@/types/database';

/**
 * 업로드 이력 조회
 */
export const getFileUploads = async (): Promise<{ data: FileUploadWithUser[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('file_uploads')
      .select(`
        *,
        user:users(name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data as FileUploadWithUser[], error: null };
  } catch (error) {
    console.error('Error fetching file uploads:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * 업로드 이력 저장
 * @param uploadData 업로드 이력 데이터
 */
export const createFileUpload = async (
  uploadData: FileUploadInsert
): Promise<{ data: FileUpload | null; error: Error | null }> => {
  try {
    const { data: newUpload, error } = await supabase
      .from('file_uploads')
      // @ts-expect-error Supabase 타입 호환성 문제
      .insert(uploadData)
      .select()
      .single();

    if (error) throw error;
    return { data: newUpload as FileUpload, error: null };
  } catch (error) {
    console.error('Error creating file upload:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * 업로드 이력 삭제
 * @param id 업로드 이력 UUID
 */
export const deleteFileUpload = async (
  id: string
): Promise<{ data: null; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('file_uploads')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data: null, error: null };
  } catch (error) {
    console.error('Error deleting file upload:', error);
    return { data: null, error: error as Error };
  }
};
