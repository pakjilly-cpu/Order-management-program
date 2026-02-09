import { supabase } from '@/lib/supabase';
import type {
  BomItem,
  BomItemWithVendor,
  BomItemInsert,
  BomItemUpdate,
} from '@/types/database';

export const getBomItems = async (
  filters?: {
    vendorId?: string;
    productSearch?: string;
    poNumber?: string;
  }
): Promise<{ data: BomItemWithVendor[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('bom_items')
      .select(`
        *,
        vendor:vendors(name, code)
      `)
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

    const { data, error } = await query;

    if (error) throw error;
    return { data: data as BomItemWithVendor[], error: null };
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
