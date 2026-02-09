import { supabase } from '@/lib/supabase';
import type {
  Order,
  OrderWithVendor,
  OrderUpdate,
  ApprovalStatus,
} from '@/types/database';

export const getPurchaseOrders = async (
  filters?: {
    vendorId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    productSearch?: string;
    poNumber?: string;
    excludeCompleted?: boolean;
  }
): Promise<{ data: OrderWithVendor[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        vendor:vendors(name, code)
      `)
      .order('order_date', { ascending: false });

    if (filters?.vendorId) {
      query = query.eq('vendor_id', filters.vendorId);
    }
    if (filters?.dateFrom) {
      query = query.gte('order_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('order_date', filters.dateTo);
    }
    if (filters?.status) {
      query = query.eq('po_status', filters.status);
    }
    if (filters?.productSearch) {
      query = query.or(`product_name.ilike.%${filters.productSearch}%,product_code.ilike.%${filters.productSearch}%`);
    }
    if (filters?.poNumber) {
      query = query.ilike('po_number', `%${filters.poNumber}%`);
    }
    if (filters?.excludeCompleted) {
      query = query.eq('is_delivery_completed', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: data as OrderWithVendor[], error: null };
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return { data: null, error: error as Error };
  }
};

export const updatePurchaseOrder = async (
  id: string,
  updateData: OrderUpdate
): Promise<{ data: Order | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as Order, error: null };
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return { data: null, error: error as Error };
  }
};

export const updateApprovalStatus = async (
  id: string,
  status: ApprovalStatus
): Promise<{ data: Order | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ approval_status: status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as Order, error: null };
  } catch (error) {
    console.error('Error updating approval status:', error);
    return { data: null, error: error as Error };
  }
};
