import { supabase } from '@/lib/supabase';
import type {
  BomItem,
  BomItemInsert,
  BomItemUpdate,
} from '@/types/database';

export const getBomItems = async (
  filters?: {
    vendorId?: string;
    productSearch?: string;
    poNumber?: string;
    supplierCode?: string;
  }
): Promise<{ data: BomItem[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('bom_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.vendorId) {
      query = query.eq('vendor_id', filters.vendorId);
    }
    if (filters?.productSearch) {
      query = query.or(`parent_material_name.ilike.%${filters.productSearch}%,parent_material_code.ilike.%${filters.productSearch}%`);
    }
    if (filters?.poNumber) {
      query = query.ilike('purchase_document', `%${filters.poNumber}%`);
    }
    if (filters?.supplierCode) {
      query = query.ilike('supplier_code', `%${filters.supplierCode}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: data as BomItem[], error: null };
  } catch (error) {
    console.error('Error fetching bom items:', error);
    return { data: null, error: error as Error };
  }
};

export const createBomItem = async (
  itemData: BomItemInsert
): Promise<{ data: BomItem | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('bom_items')
      .insert(itemData)
      .select()
      .single();

    if (error) throw error;
    return { data: data as BomItem, error: null };
  } catch (error) {
    console.error('Error creating bom item:', error);
    return { data: null, error: error as Error };
  }
};

export const createBomItems = async (
  items: BomItemInsert[]
): Promise<{ data: BomItem[] | null; error: Error | null; count: number }> => {
  try {
    const BATCH_SIZE = 100;
    const allInserted: BomItem[] = [];

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('bom_items')
        .insert(batch)
        .select();

      if (error) throw error;
      if (data) allInserted.push(...(data as BomItem[]));
    }

    return { data: allInserted, error: null, count: allInserted.length };
  } catch (error: unknown) {
    console.error('Error creating bom items:', error);
    const pgErr = error as { message?: string; details?: string; hint?: string; code?: string };
    const msg = [pgErr.message, pgErr.details, pgErr.hint, pgErr.code].filter(Boolean).join(' | ');
    return { data: null, error: new Error(msg || 'Unknown error'), count: 0 };
  }
};

export const updateBomItem = async (
  id: string,
  updateData: BomItemUpdate
): Promise<{ data: BomItem | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('bom_items')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as BomItem, error: null };
  } catch (error) {
    console.error('Error updating bom item:', error);
    return { data: null, error: error as Error };
  }
};
