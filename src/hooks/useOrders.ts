/**
 * useOrders Hook
 * 주문 데이터 관리를 위한 커스텀 훅
 */

import { useState, useCallback, useEffect } from 'react';
import type { OrderWithVendor, OrderInsert, OrderUpdate } from '@/types/database';
import {
  getOrders,
  getOrdersByDateRange,
  createOrders,
  updateOrder,
  toggleOrderCompletion,
  deleteOrder,
  deleteAllOrders
} from '@/services/orderService';

interface UseOrdersOptions {
  vendorId?: string;
  autoFetch?: boolean;
}

interface UseOrdersReturn {
  orders: OrderWithVendor[];
  isLoading: boolean;
  error: Error | null;
  fetchOrders: (vendorId?: string) => Promise<void>;
  fetchOrdersByDateRange: (startDate: string, endDate: string) => Promise<void>;
  addOrders: (orders: OrderInsert[]) => Promise<{ success: boolean; error: Error | null }>;
  editOrder: (id: string, data: OrderUpdate) => Promise<{ success: boolean; error: Error | null }>;
  toggleComplete: (id: string) => Promise<{ success: boolean; error: Error | null }>;
  removeOrder: (id: string) => Promise<{ success: boolean; error: Error | null }>;
  removeAllOrders: () => Promise<{ success: boolean; error: Error | null }>;
  refetch: () => Promise<void>;
}

export const useOrders = (options: UseOrdersOptions = {}): UseOrdersReturn => {
  const { vendorId, autoFetch = true } = options;

  const [orders, setOrders] = useState<OrderWithVendor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrders = useCallback(async (filterVendorId?: string) => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await getOrders(filterVendorId);

    if (fetchError) {
      setError(fetchError);
      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setIsLoading(false);
  }, []);

  const fetchOrdersByDateRange = useCallback(async (startDate: string, endDate: string) => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await getOrdersByDateRange(startDate, endDate);

    if (fetchError) {
      setError(fetchError);
      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setIsLoading(false);
  }, []);

  const addOrders = useCallback(async (newOrders: OrderInsert[]) => {
    const { data, error: createError } = await createOrders(newOrders);

    if (createError) {
      return { success: false, error: createError };
    }

    // 목록 새로고침
    await fetchOrders(vendorId);
    return { success: true, error: null };
  }, [fetchOrders, vendorId]);

  const editOrder = useCallback(async (id: string, data: OrderUpdate) => {
    const { error: updateError } = await updateOrder(id, data);

    if (updateError) {
      return { success: false, error: updateError };
    }

    // 로컬 상태 업데이트
    setOrders(prev => prev.map(order =>
      order.id === id ? { ...order, ...data } : order
    ));

    return { success: true, error: null };
  }, []);

  const toggleComplete = useCallback(async (id: string) => {
    const { data, error: toggleError } = await toggleOrderCompletion(id);

    if (toggleError) {
      return { success: false, error: toggleError };
    }

    // 로컬 상태 업데이트
    if (data) {
      setOrders(prev => prev.map(order =>
        order.id === id
          ? { ...order, is_completed: data.is_completed, completed_at: data.completed_at }
          : order
      ));
    }

    return { success: true, error: null };
  }, []);

  const removeOrder = useCallback(async (id: string) => {
    const { error: deleteError } = await deleteOrder(id);

    if (deleteError) {
      return { success: false, error: deleteError };
    }

    // 로컬 상태 업데이트
    setOrders(prev => prev.filter(order => order.id !== id));

    return { success: true, error: null };
  }, []);

  const removeAllOrders = useCallback(async () => {
    const { error: deleteError } = await deleteAllOrders();

    if (deleteError) {
      return { success: false, error: deleteError };
    }

    setOrders([]);
    return { success: true, error: null };
  }, []);

  const refetch = useCallback(async () => {
    await fetchOrders(vendorId);
  }, [fetchOrders, vendorId]);

  // 초기 데이터 로드
  useEffect(() => {
    if (autoFetch) {
      fetchOrders(vendorId);
    }
  }, [autoFetch, fetchOrders, vendorId]);

  return {
    orders,
    isLoading,
    error,
    fetchOrders,
    fetchOrdersByDateRange,
    addOrders,
    editOrder,
    toggleComplete,
    removeOrder,
    removeAllOrders,
    refetch
  };
};
