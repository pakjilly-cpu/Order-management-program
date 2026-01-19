import { useState, useCallback, useEffect } from 'react';
import type { 
  ProductionScheduleWithDetails, 
  ProductionScheduleUpdate,
  Order,
  Vendor 
} from '@/types/database';
import {
  getProductionSchedules,
  getSchedulesByDateRange,
  updateProductionSchedule,
  updateScheduleDates,
  deleteProductionSchedule,
  generateSchedulesForOrders,
  regenerateScheduleForOrder
} from '@/services/productionScheduleService';

interface UseProductionSchedulesOptions {
  vendorId?: string;
  autoFetch?: boolean;
}

interface UseProductionSchedulesReturn {
  schedules: ProductionScheduleWithDetails[];
  isLoading: boolean;
  error: Error | null;
  warnings: string[];
  fetchSchedules: (vendorId?: string) => Promise<void>;
  fetchSchedulesByDateRange: (startDate: string, endDate: string, vendorId?: string) => Promise<void>;
  updateSchedule: (id: string, data: ProductionScheduleUpdate) => Promise<{ success: boolean; error: Error | null }>;
  moveSchedule: (id: string, startDate: string, endDate: string) => Promise<{ success: boolean; error: Error | null }>;
  removeSchedule: (id: string) => Promise<{ success: boolean; error: Error | null }>;
  generateSchedules: (orders: Order[], vendors: Vendor[]) => Promise<{ success: boolean; error: Error | null }>;
  regenerateSchedule: (order: Order, vendor: Vendor) => Promise<{ success: boolean; error: Error | null; warning?: string }>;
  refetch: () => Promise<void>;
  clearWarnings: () => void;
}

export const useProductionSchedules = (
  options: UseProductionSchedulesOptions = {}
): UseProductionSchedulesReturn => {
  const { vendorId, autoFetch = true } = options;

  const [schedules, setSchedules] = useState<ProductionScheduleWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const fetchSchedules = useCallback(async (filterVendorId?: string) => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await getProductionSchedules(filterVendorId);

    if (fetchError) {
      setError(fetchError);
      setSchedules([]);
    } else {
      setSchedules(data || []);
    }

    setIsLoading(false);
  }, []);

  const fetchSchedulesByDateRange = useCallback(async (
    startDate: string, 
    endDate: string,
    filterVendorId?: string
  ) => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await getSchedulesByDateRange(
      startDate, 
      endDate, 
      filterVendorId
    );

    if (fetchError) {
      setError(fetchError);
      setSchedules([]);
    } else {
      setSchedules(data || []);
    }

    setIsLoading(false);
  }, []);

  const updateSchedule = useCallback(async (id: string, data: ProductionScheduleUpdate) => {
    const { error: updateError } = await updateProductionSchedule(id, data);

    if (updateError) {
      return { success: false, error: updateError };
    }

    setSchedules(prev => prev.map(schedule =>
      schedule.id === id ? { ...schedule, ...data } : schedule
    ));

    return { success: true, error: null };
  }, []);

  const moveSchedule = useCallback(async (id: string, startDate: string, endDate: string) => {
    const { data, error: updateError } = await updateScheduleDates(id, startDate, endDate);

    if (updateError) {
      return { success: false, error: updateError };
    }

    if (data) {
      setSchedules(prev => prev.map(schedule =>
        schedule.id === id 
          ? { ...schedule, start_date: startDate, end_date: endDate, is_manually_adjusted: true }
          : schedule
      ));
    }

    return { success: true, error: null };
  }, []);

  const removeSchedule = useCallback(async (id: string) => {
    const { error: deleteError } = await deleteProductionSchedule(id);

    if (deleteError) {
      return { success: false, error: deleteError };
    }

    setSchedules(prev => prev.filter(schedule => schedule.id !== id));

    return { success: true, error: null };
  }, []);

  const generateSchedules = useCallback(async (orders: Order[], vendors: Vendor[]) => {
    setIsLoading(true);
    setError(null);

    const { data, error: genError, warnings: genWarnings } = await generateSchedulesForOrders(
      orders, 
      vendors
    );

    if (genError) {
      setError(genError);
      setIsLoading(false);
      return { success: false, error: genError };
    }

    if (genWarnings.length > 0) {
      setWarnings(genWarnings);
    }

    await fetchSchedules(vendorId);
    setIsLoading(false);

    return { success: true, error: null };
  }, [fetchSchedules, vendorId]);

  const regenerateSchedule = useCallback(async (order: Order, vendor: Vendor) => {
    const { data, error: regenError, warning } = await regenerateScheduleForOrder(order, vendor);

    if (regenError) {
      return { success: false, error: regenError, warning };
    }

    await fetchSchedules(vendorId);

    return { success: true, error: null, warning };
  }, [fetchSchedules, vendorId]);

  const refetch = useCallback(async () => {
    await fetchSchedules(vendorId);
  }, [fetchSchedules, vendorId]);

  const clearWarnings = useCallback(() => {
    setWarnings([]);
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchSchedules(vendorId);
    }
  }, [autoFetch, fetchSchedules, vendorId]);

  return {
    schedules,
    isLoading,
    error,
    warnings,
    fetchSchedules,
    fetchSchedulesByDateRange,
    updateSchedule,
    moveSchedule,
    removeSchedule,
    generateSchedules,
    regenerateSchedule,
    refetch,
    clearWarnings
  };
};
