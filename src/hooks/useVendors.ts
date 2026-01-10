/**
 * useVendors Hook
 * 외주처 데이터 관리를 위한 커스텀 훅
 */

import { useState, useCallback, useEffect } from 'react';
import type { Vendor, VendorInsert, VendorUpdate, VendorTargetWithVendor } from '@/types/database';
import {
  getVendors,
  getVendorByCode,
  getVendorById,
  createVendor,
  updateVendor,
  getVendorTargets,
  updateVendorTarget
} from '@/services/vendorService';

interface UseVendorsOptions {
  autoFetch?: boolean;
}

interface UseVendorsReturn {
  vendors: Vendor[];
  isLoading: boolean;
  error: Error | null;
  fetchVendors: () => Promise<void>;
  findVendorByCode: (code: string) => Promise<{ data: Vendor | null; error: Error | null }>;
  findVendorById: (id: string) => Promise<{ data: Vendor | null; error: Error | null }>;
  addVendor: (data: VendorInsert) => Promise<{ success: boolean; data: Vendor | null; error: Error | null }>;
  editVendor: (id: string, data: VendorUpdate) => Promise<{ success: boolean; error: Error | null }>;
  refetch: () => Promise<void>;
}

export const useVendors = (options: UseVendorsOptions = {}): UseVendorsReturn => {
  const { autoFetch = true } = options;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchVendors = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await getVendors();

    if (fetchError) {
      setError(fetchError);
      setVendors([]);
    } else {
      setVendors(data || []);
    }

    setIsLoading(false);
  }, []);

  const findVendorByCode = useCallback(async (code: string) => {
    return await getVendorByCode(code);
  }, []);

  const findVendorById = useCallback(async (id: string) => {
    return await getVendorById(id);
  }, []);

  const addVendor = useCallback(async (data: VendorInsert) => {
    const { data: newVendor, error: createError } = await createVendor(data);

    if (createError) {
      return { success: false, data: null, error: createError };
    }

    // 로컬 상태 업데이트
    if (newVendor) {
      setVendors(prev => [...prev, newVendor].sort((a, b) => a.name.localeCompare(b.name)));
    }

    return { success: true, data: newVendor, error: null };
  }, []);

  const editVendor = useCallback(async (id: string, data: VendorUpdate) => {
    const { data: updatedVendor, error: updateError } = await updateVendor(id, data);

    if (updateError) {
      return { success: false, error: updateError };
    }

    // 로컬 상태 업데이트
    if (updatedVendor) {
      setVendors(prev => prev.map(vendor =>
        vendor.id === id ? updatedVendor : vendor
      ));
    }

    return { success: true, error: null };
  }, []);

  const refetch = useCallback(async () => {
    await fetchVendors();
  }, [fetchVendors]);

  // 초기 데이터 로드
  useEffect(() => {
    if (autoFetch) {
      fetchVendors();
    }
  }, [autoFetch, fetchVendors]);

  return {
    vendors,
    isLoading,
    error,
    fetchVendors,
    findVendorByCode,
    findVendorById,
    addVendor,
    editVendor,
    refetch
  };
};

// 월간 목표 관리를 위한 별도 훅
interface UseVendorTargetsOptions {
  year: number;
  month: number;
  autoFetch?: boolean;
}

interface UseVendorTargetsReturn {
  targets: VendorTargetWithVendor[];
  isLoading: boolean;
  error: Error | null;
  fetchTargets: () => Promise<void>;
  setTarget: (vendorId: string, quantity: number) => Promise<{ success: boolean; error: Error | null }>;
  refetch: () => Promise<void>;
}

export const useVendorTargets = (options: UseVendorTargetsOptions): UseVendorTargetsReturn => {
  const { year, month, autoFetch = true } = options;

  const [targets, setTargets] = useState<VendorTargetWithVendor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTargets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await getVendorTargets(year, month);

    if (fetchError) {
      setError(fetchError);
      setTargets([]);
    } else {
      setTargets(data || []);
    }

    setIsLoading(false);
  }, [year, month]);

  const setTarget = useCallback(async (vendorId: string, quantity: number) => {
    const { data, error: updateError } = await updateVendorTarget(vendorId, year, month, quantity);

    if (updateError) {
      return { success: false, error: updateError };
    }

    // 목록 새로고침
    await fetchTargets();
    return { success: true, error: null };
  }, [year, month, fetchTargets]);

  const refetch = useCallback(async () => {
    await fetchTargets();
  }, [fetchTargets]);

  // 초기 데이터 로드
  useEffect(() => {
    if (autoFetch) {
      fetchTargets();
    }
  }, [autoFetch, fetchTargets]);

  return {
    targets,
    isLoading,
    error,
    fetchTargets,
    setTarget,
    refetch
  };
};
