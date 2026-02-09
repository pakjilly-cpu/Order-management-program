import { supabase } from '@/lib/supabase';
import type {
  MaterialSettlement,
  MaterialSettlementWithVendor,
  MaterialSettlementInsert,
  MaterialSettlementUpdate,
  MaterialReturn,
  MaterialReturnWithVendor,
  MaterialReturnInsert,
  MaterialReturnUpdate,
} from '@/types/database';

export const getSettlements = async (
  filters?: {
    vendorId?: string;
    dateFrom?: string;
    dateTo?: string;
    poNumber?: string;
    productCode?: string;
    materialCode?: string;
    registrationStatus?: string;
    excludeZeroStock?: boolean;
  }
): Promise<{ data: MaterialSettlementWithVendor[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('material_settlements')
      .select(`
        *,
        vendor:vendors(name, code)
      `)
      .order('created_at', { ascending: false });

    if (filters?.vendorId) {
      query = query.eq('vendor_id', filters.vendorId);
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    if (filters?.poNumber) {
      query = query.ilike('po_number', `%${filters.poNumber}%`);
    }
    if (filters?.productCode) {
      query = query.ilike('product_code', `%${filters.productCode}%`);
    }
    if (filters?.materialCode) {
      query = query.ilike('material_code', `%${filters.materialCode}%`);
    }
    if (filters?.registrationStatus && filters.registrationStatus !== 'all') {
      query = query.eq('is_registered', filters.registrationStatus === 'registered');
    }
    if (filters?.excludeZeroStock) {
      query = query.gt('remaining_stock', 0);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: data as MaterialSettlementWithVendor[], error: null };
  } catch (error) {
    console.error('Error fetching material settlements:', error);
    return { data: null, error: error as Error };
  }
};

export const createSettlement = async (
  settlementData: MaterialSettlementInsert
): Promise<{ data: MaterialSettlement | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('material_settlements')
      .insert(settlementData)
      .select()
      .single();

    if (error) throw error;
    return { data: data as MaterialSettlement, error: null };
  } catch (error) {
    console.error('Error creating material settlement:', error);
    return { data: null, error: error as Error };
  }
};

export const updateSettlement = async (
  id: string,
  updateData: MaterialSettlementUpdate
): Promise<{ data: MaterialSettlement | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('material_settlements')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as MaterialSettlement, error: null };
  } catch (error) {
    console.error('Error updating material settlement:', error);
    return { data: null, error: error as Error };
  }
};

export const getReturns = async (
  filters?: {
    vendorId?: string;
    materialSearch?: string;
    includeZeroStock?: boolean;
  }
): Promise<{ data: MaterialReturnWithVendor[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('material_returns')
      .select(`
        *,
        vendor:vendors(name, code)
      `)
      .order('created_at', { ascending: false });

    if (filters?.vendorId) {
      query = query.eq('vendor_id', filters.vendorId);
    }
    if (filters?.materialSearch) {
      query = query.or(`material_name.ilike.%${filters.materialSearch}%,material_code.ilike.%${filters.materialSearch}%`);
    }
    if (!filters?.includeZeroStock) {
      query = query.gt('stock_quantity', 0);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: data as MaterialReturnWithVendor[], error: null };
  } catch (error) {
    console.error('Error fetching material returns:', error);
    return { data: null, error: error as Error };
  }
};

export const createReturn = async (
  returnData: MaterialReturnInsert
): Promise<{ data: MaterialReturn | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('material_returns')
      .insert(returnData)
      .select()
      .single();

    if (error) throw error;
    return { data: data as MaterialReturn, error: null };
  } catch (error) {
    console.error('Error creating material return:', error);
    return { data: null, error: error as Error };
  }
};

export const updateReturn = async (
  id: string,
  updateData: MaterialReturnUpdate
): Promise<{ data: MaterialReturn | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('material_returns')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as MaterialReturn, error: null };
  } catch (error) {
    console.error('Error updating material return:', error);
    return { data: null, error: error as Error };
  }
};
