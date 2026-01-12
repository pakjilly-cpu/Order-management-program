/**
 * Vendor Service
 * 외주처 관련 CRUD 서비스
 */

import { supabase } from '@/lib/supabase';
import type { Vendor, VendorInsert, VendorUpdate, VendorTarget, VendorTargetWithVendor } from '@/types/database';

/**
 * 전체 외주처 목록 조회
 */
export const getVendors = async (): Promise<{ data: Vendor[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return { data: data as Vendor[], error: null };
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * 코드로 외주처 조회
 * @param code 6자리 외주처 코드
 */
export const getVendorByCode = async (
  code: string
): Promise<{ data: Vendor | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('code', code)
      .single();

    if (error) throw error;
    return { data: data as Vendor, error: null };
  } catch (error) {
    console.error('Error fetching vendor by code:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * ID로 외주처 조회
 * @param id 외주처 UUID
 */
export const getVendorById = async (
  id: string
): Promise<{ data: Vendor | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data: data as Vendor, error: null };
  } catch (error) {
    console.error('Error fetching vendor by id:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * 외주처 생성
 * @param vendorData 생성할 외주처 데이터
 */
export const createVendor = async (
  vendorData: VendorInsert
): Promise<{ data: Vendor | null; error: Error | null }> => {
  try {
    const { data: newVendor, error } = await supabase
      .from('vendors')
      .insert(vendorData)
      .select()
      .single();

    if (error) throw error;
    return { data: newVendor as Vendor, error: null };
  } catch (error) {
    console.error('Error creating vendor:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * 외주처 수정
 * @param id 외주처 UUID
 * @param updateData 수정할 데이터
 */
export const updateVendor = async (
  id: string,
  updateData: VendorUpdate
): Promise<{ data: Vendor | null; error: Error | null }> => {
  try {
    const { data: updatedVendor, error } = await supabase
      .from('vendors')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: updatedVendor as Vendor, error: null };
  } catch (error) {
    console.error('Error updating vendor:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * 월간 목표 조회
 * @param year 연도
 * @param month 월 (1-12)
 */
export const getVendorTargets = async (
  year: number,
  month: number
): Promise<{ data: VendorTargetWithVendor[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('vendor_targets')
      .select(`
        *,
        vendor:vendors(name, code)
      `)
      .eq('year', year)
      .eq('month', month);

    if (error) throw error;
    return { data: data as VendorTargetWithVendor[], error: null };
  } catch (error) {
    console.error('Error fetching vendor targets:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * 월간 목표 수정 (없으면 생성, 있으면 업데이트 - upsert)
 * @param vendorId 외주처 UUID
 * @param year 연도
 * @param month 월 (1-12)
 * @param quantity 목표 수량
 */
export const updateVendorTarget = async (
  vendorId: string,
  year: number,
  month: number,
  quantity: number
): Promise<{ data: VendorTarget | null; error: Error | null }> => {
  try {
    // 기존 목표 확인
    const { data: existingTarget, error: fetchError } = await supabase
      .from('vendor_targets')
      .select('id')
      .eq('vendor_id', vendorId)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let resultData: VendorTarget | null = null;

    if (existingTarget) {
      // 업데이트
      const existing = existingTarget as { id: string };
      const { data, error } = await supabase
        .from('vendor_targets')
        .update({ target_quantity: quantity })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      resultData = data as VendorTarget;
    } else {
      // 새로 생성
      const { data, error } = await supabase
        .from('vendor_targets')
        .insert({
          vendor_id: vendorId,
          year,
          month,
          target_quantity: quantity
        })
        .select()
        .single();

      if (error) throw error;
      resultData = data as VendorTarget;
    }

    return { data: resultData, error: null };
  } catch (error) {
    console.error('Error updating vendor target:', error);
    return { data: null, error: error as Error };
  }
};
