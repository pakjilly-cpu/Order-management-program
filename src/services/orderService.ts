/**
 * Order Service
 * 주문 관련 CRUD 서비스
 */

import { supabase } from '@/lib/supabase';
import type { Order, OrderWithVendor, OrderInsert, OrderUpdate } from '@/types/database';

/**
 * 주문 목록 조회 (vendor 정보 join)
 * @param vendorId 특정 외주처의 주문만 조회 (optional)
 */
export const getOrders = async (
  vendorId?: string
): Promise<{ data: OrderWithVendor[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        vendor:vendors(name, code)
      `)
      .order('order_date', { ascending: false });

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: data as OrderWithVendor[], error: null };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * 기간별 주문 조회
 * @param startDate 시작 날짜 (YYYY-MM-DD)
 * @param endDate 종료 날짜 (YYYY-MM-DD)
 */
export const getOrdersByDateRange = async (
  startDate: string,
  endDate: string
): Promise<{ data: OrderWithVendor[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        vendor:vendors(name, code)
      `)
      .gte('order_date', startDate)
      .lte('order_date', endDate)
      .order('order_date', { ascending: false });

    if (error) throw error;
    return { data: data as OrderWithVendor[], error: null };
  } catch (error) {
    console.error('Error fetching orders by date range:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * 주문 일괄 생성
 * @param orders 생성할 주문 배열
 */
export const createOrders = async (
  orders: OrderInsert[]
): Promise<{ data: Order[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert(orders)
      .select();

    if (error) throw error;
    return { data: data as Order[], error: null };
  } catch (error) {
    console.error('Error creating orders:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * 주문 수정
 * @param id 주문 ID
 * @param updateData 수정할 데이터
 */
export const updateOrder = async (
  id: string,
  updateData: OrderUpdate
): Promise<{ data: Order | null; error: Error | null }> => {
  try {
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: updatedOrder as Order, error: null };
  } catch (error) {
    console.error('Error updating order:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * 주문 완료 상태 토글
 * @param id 주문 ID
 */
export const toggleOrderCompletion = async (
  id: string
): Promise<{ data: Order | null; error: Error | null }> => {
  try {
    // 먼저 현재 상태 조회
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('is_completed')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!currentOrder) throw new Error('Order not found');

    const current = currentOrder as { is_completed: boolean };
    const newIsCompleted = !current.is_completed;
    const completedAt = newIsCompleted ? new Date().toISOString() : null;

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        is_completed: newIsCompleted,
        completed_at: completedAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    return { data: updatedOrder as Order, error: null };
  } catch (error) {
    console.error('Error toggling order completion:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * 주문 삭제
 * @param id 주문 ID
 */
export const deleteOrder = async (
  id: string
): Promise<{ data: null; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data: null, error: null };
  } catch (error) {
    console.error('Error deleting order:', error);
    return { data: null, error: error as Error };
  }
};

/**
 * 전체 주문 삭제
 */
export const deleteAllOrders = async (): Promise<{ data: null; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 레코드 삭제를 위한 조건

    if (error) throw error;
    return { data: null, error: null };
  } catch (error) {
    console.error('Error deleting all orders:', error);
    return { data: null, error: error as Error };
  }
};
