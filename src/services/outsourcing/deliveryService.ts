import { supabase } from '@/lib/supabase';
import type {
  DeliveryNote,
  DeliveryNoteWithVendor,
  DeliveryNoteInsert,
  DeliveryNoteUpdate,
  DeliveryItem,
  DeliveryItemWithNote,
  DeliveryItemInsert,
  DeliveryItemUpdate,
} from '@/types/database';

export const getDeliveryNotes = async (
  filters?: {
    vendorId?: string;
    dateFrom?: string;
    dateTo?: string;
    excludeCompleted?: boolean;
  }
): Promise<{ data: DeliveryNoteWithVendor[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('delivery_notes')
      .select(`
        *,
        vendor:vendors(name, code)
      `)
      .order('delivery_date', { ascending: false });

    if (filters?.vendorId) {
      query = query.eq('vendor_id', filters.vendorId);
    }
    if (filters?.dateFrom) {
      query = query.gte('delivery_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('delivery_date', filters.dateTo);
    }
    if (filters?.excludeCompleted) {
      query = query.eq('is_completed', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: data as DeliveryNoteWithVendor[], error: null };
  } catch (error) {
    console.error('Error fetching delivery notes:', error);
    return { data: null, error: error as Error };
  }
};

export const createDeliveryNote = async (
  noteData: DeliveryNoteInsert
): Promise<{ data: DeliveryNote | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('delivery_notes')
      .insert(noteData)
      .select()
      .single();

    if (error) throw error;
    return { data: data as DeliveryNote, error: null };
  } catch (error) {
    console.error('Error creating delivery note:', error);
    return { data: null, error: error as Error };
  }
};

export const updateDeliveryNote = async (
  id: string,
  updateData: DeliveryNoteUpdate
): Promise<{ data: DeliveryNote | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('delivery_notes')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as DeliveryNote, error: null };
  } catch (error) {
    console.error('Error updating delivery note:', error);
    return { data: null, error: error as Error };
  }
};

export const deleteDeliveryNote = async (
  id: string
): Promise<{ data: null; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('delivery_notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data: null, error: null };
  } catch (error) {
    console.error('Error deleting delivery note:', error);
    return { data: null, error: error as Error };
  }
};

export const getDeliveryItems = async (
  deliveryNoteId: string
): Promise<{ data: DeliveryItem[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('delivery_items')
      .select('*')
      .eq('delivery_note_id', deliveryNoteId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data: data as DeliveryItem[], error: null };
  } catch (error) {
    console.error('Error fetching delivery items:', error);
    return { data: null, error: error as Error };
  }
};

export const getDeliveryItemsByFilters = async (
  filters?: {
    vendorId?: string;
    dateFrom?: string;
    dateTo?: string;
    poNumber?: string;
    excludeCompleted?: boolean;
  }
): Promise<{ data: DeliveryItemWithNote[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('delivery_items')
      .select(`
        *,
        delivery_note:delivery_notes(delivery_number, delivery_date, is_completed)
      `)
      .order('created_at', { ascending: false });

    if (filters?.vendorId) {
      query = query.eq('delivery_note.vendor_id', filters.vendorId);
    }
    if (filters?.dateFrom) {
      query = query.gte('delivery_note.delivery_date', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('delivery_note.delivery_date', filters.dateTo);
    }
    if (filters?.poNumber) {
      query = query.ilike('po_number', `%${filters.poNumber}%`);
    }
    if (filters?.excludeCompleted) {
      query = query.eq('delivery_note.is_completed', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: data as DeliveryItemWithNote[], error: null };
  } catch (error) {
    console.error('Error fetching delivery items by filters:', error);
    return { data: null, error: error as Error };
  }
};

export const createDeliveryItems = async (
  items: DeliveryItemInsert[]
): Promise<{ data: DeliveryItem[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('delivery_items')
      .insert(items)
      .select();

    if (error) throw error;
    return { data: data as DeliveryItem[], error: null };
  } catch (error) {
    console.error('Error creating delivery items:', error);
    return { data: null, error: error as Error };
  }
};

export const updateDeliveryItem = async (
  id: string,
  updateData: DeliveryItemUpdate
): Promise<{ data: DeliveryItem | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('delivery_items')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data: data as DeliveryItem, error: null };
  } catch (error) {
    console.error('Error updating delivery item:', error);
    return { data: null, error: error as Error };
  }
};

export const deleteDeliveryItem = async (
  id: string
): Promise<{ data: null; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('delivery_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data: null, error: null };
  } catch (error) {
    console.error('Error deleting delivery item:', error);
    return { data: null, error: error as Error };
  }
};
