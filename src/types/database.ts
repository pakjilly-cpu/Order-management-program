/**
 * Database Types
 * Supabase Database 타입 정의
 */

// ============================================
// 기본 타입
// ============================================

export type UserRole = 'admin' | 'user';

// ============================================
// 테이블 타입 정의
// ============================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  code: string;
  contact_email: string | null;
  is_active: boolean;
  daily_capacity: number;
  line_count: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  vendor_id: string;
  product_name: string;
  product_code: string | null;
  quantity: number;
  delivery_date: string | null;
  order_date: string;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
  uploaded_by: string | null;
  po_number: string | null;
  item_number: string | null;
  unit: string;
  unit_price: number;
  currency: string;
  price_unit: number;
  request_date: string | null;
  received_quantity: number;
  remaining_quantity: number;
  warehouse: string | null;
  cosmax_comment: string | null;
  customer_code: string | null;
  po_status: PurchaseOrderStatus;
  is_delivery_completed: boolean;
  packaging_image_url: string | null;
  product_image_url: string | null;
  approval_status: ApprovalStatus;
  created_at: string;
  updated_at: string;
}

export interface VendorTarget {
  id: string;
  vendor_id: string;
  target_quantity: number;
  year: number;
  month: number;
  created_at: string;
}

export interface FileUpload {
  id: string;
  file_name: string;
  order_count: number;
  order_date: string;
  uploaded_by: string;
  created_at: string;
}

export type ProductionStatus = 'planned' | 'in_progress' | 'completed' | 'delayed';
export type PurchaseOrderStatus = 'pending' | 'confirmed' | 'changed' | 'completed' | 'cancelled';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type BomStatus = 'pending' | 'received' | 'partial' | 'shortage';
export type DeliveryProgressStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';

export interface ProductionSchedule {
  id: string;
  order_id: string;
  vendor_id: string;
  start_date: string;
  end_date: string;
  transfer_date: string | null;
  earliest_production_date: string | null;
  status: ProductionStatus;
  is_manually_adjusted: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PurchaseOrder = Order;

export interface BomItem {
  id: string;
  order_id: string | null;
  vendor_id: string;
  manager_name: string | null;
  instruction_date: string | null;
  supplier_code: string | null;
  supplier_name: string | null;
  purchase_document: string | null;
  parent_material_code: string | null;
  parent_material_name: string | null;
  purchase_quantity: number;
  purchase_unit: string;
  status: BomStatus;
  child_material_code: string | null;
  child_material_name: string | null;
  required_quantity: number;
  required_unit: string;
  vendor_stock: number;
  shortage_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryNote {
  id: string;
  vendor_id: string;
  delivery_number: string | null;
  delivery_date: string;
  is_completed: boolean;
  warehouse: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryItem {
  id: string;
  delivery_note_id: string;
  order_id: string | null;
  customer_code: string | null;
  product_code: string | null;
  product_name: string;
  po_number: string | null;
  po_item_number: string | null;
  po_quantity: number;
  previously_received: number;
  delivery_allowed: number;
  cosmax_comment: string | null;
  progress_status: DeliveryProgressStatus;
  pallet_count: number;
  items_per_box: number;
  box_count: number;
  remainder: number;
  production_date: string | null;
  lot_number: string | null;
  received_quantity: number;
  managed_product: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaterialSettlement {
  id: string;
  vendor_id: string;
  delivery_note_id: string | null;
  po_number: string | null;
  po_item_number: string | null;
  product_code: string | null;
  product_name: string | null;
  material_code: string | null;
  material_name: string | null;
  lot_number: string | null;
  original_quantity: number;
  normal_usage: number;
  damaged_usage: number;
  remaining_stock: number;
  is_registered: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaterialReturn {
  id: string;
  vendor_id: string;
  material_code: string;
  material_name: string | null;
  stock_quantity: number;
  lot_number: string | null;
  settlement_return: number;
  warehouse: string | null;
  notes: string | null;
  bulk_ratio: number | null;
  is_return_target: boolean;
  manufacture_date: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Join 타입 (관계 포함)
// ============================================

export interface OrderWithVendor extends Order {
  vendor: Pick<Vendor, 'name' | 'code'>;
}

export interface VendorTargetWithVendor extends VendorTarget {
  vendor: Pick<Vendor, 'name' | 'code'>;
}

export interface FileUploadWithUser extends FileUpload {
  user: Pick<User, 'name' | 'email'>;
}

export interface ProductionScheduleWithDetails extends ProductionSchedule {
  order: Pick<Order, 'product_name' | 'product_code' | 'quantity' | 'delivery_date' | 'order_date'>;
  vendor: Pick<Vendor, 'name' | 'code' | 'daily_capacity' | 'line_count'>;
}

export interface OrderWithSchedule extends Order {
  vendor: Pick<Vendor, 'name' | 'code' | 'daily_capacity' | 'line_count'>;
  schedule: ProductionSchedule | null;
}

export type PurchaseOrderWithVendor = OrderWithVendor;

export interface BomItemWithVendor extends BomItem {
  vendor: Pick<Vendor, 'name' | 'code'>;
}

export interface DeliveryNoteWithVendor extends DeliveryNote {
  vendor: Pick<Vendor, 'name' | 'code'>;
}

export interface DeliveryItemWithNote extends DeliveryItem {
  delivery_note: Pick<DeliveryNote, 'delivery_number' | 'delivery_date' | 'is_completed'>;
}

export interface MaterialSettlementWithVendor extends MaterialSettlement {
  vendor: Pick<Vendor, 'name' | 'code'>;
}

export interface MaterialReturnWithVendor extends MaterialReturn {
  vendor: Pick<Vendor, 'name' | 'code'>;
}

// ============================================
// Insert/Update 타입 (새 레코드 생성/수정 시 사용)
// ============================================

export type UserInsert = Omit<User, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};

export type UserUpdate = Partial<Omit<User, 'id' | 'created_at'>> & {
  updated_at?: string;
};

export type VendorInsert = Omit<Vendor, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type VendorUpdate = Partial<Omit<Vendor, 'id' | 'created_at'>> & {
  updated_at?: string;
};

export type OrderInsert = Omit<Order,
  'id' | 'created_at' | 'updated_at' | 'is_completed' | 'completed_at' |
  'po_number' | 'item_number' | 'unit' | 'unit_price' | 'currency' | 'price_unit' |
  'request_date' | 'received_quantity' | 'remaining_quantity' | 'warehouse' |
  'cosmax_comment' | 'customer_code' | 'po_status' | 'is_delivery_completed' |
  'packaging_image_url' | 'product_image_url' | 'approval_status'
> & {
  id?: string;
  is_completed?: boolean;
  completed_at?: string | null;
  po_number?: string | null;
  item_number?: string | null;
  unit?: string;
  unit_price?: number;
  currency?: string;
  price_unit?: number;
  request_date?: string | null;
  received_quantity?: number;
  remaining_quantity?: number;
  warehouse?: string | null;
  cosmax_comment?: string | null;
  customer_code?: string | null;
  po_status?: PurchaseOrderStatus;
  is_delivery_completed?: boolean;
  packaging_image_url?: string | null;
  product_image_url?: string | null;
  approval_status?: ApprovalStatus;
  created_at?: string;
  updated_at?: string;
};

export type OrderUpdate = Partial<Omit<Order, 'id' | 'created_at'>> & {
  updated_at?: string;
};

export type VendorTargetInsert = Omit<VendorTarget, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type FileUploadInsert = Omit<FileUpload, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type ProductionScheduleInsert = Omit<ProductionSchedule, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProductionScheduleUpdate = Partial<Omit<ProductionSchedule, 'id' | 'order_id' | 'created_at'>> & {
  updated_at?: string;
};

export type PurchaseOrderInsert = OrderInsert;

export type PurchaseOrderUpdate = OrderUpdate;

export type BomItemInsert = Omit<BomItem, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type BomItemUpdate = Partial<Omit<BomItem, 'id' | 'created_at'>> & {
  updated_at?: string;
};

export type DeliveryNoteInsert = Omit<DeliveryNote, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type DeliveryNoteUpdate = Partial<Omit<DeliveryNote, 'id' | 'created_at'>> & {
  updated_at?: string;
};

export type DeliveryItemInsert = Omit<DeliveryItem, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type DeliveryItemUpdate = Partial<Omit<DeliveryItem, 'id' | 'created_at'>> & {
  updated_at?: string;
};

export type MaterialSettlementInsert = Omit<MaterialSettlement, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type MaterialSettlementUpdate = Partial<Omit<MaterialSettlement, 'id' | 'created_at'>> & {
  updated_at?: string;
};

export type MaterialReturnInsert = Omit<MaterialReturn, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type MaterialReturnUpdate = Partial<Omit<MaterialReturn, 'id' | 'created_at'>> & {
  updated_at?: string;
};

// ============================================
// Supabase Database 타입 (supabase-js 클라이언트용)
// 참고: Supabase CLI로 자동 생성된 타입을 사용하는 것이 권장됩니다.
// `npx supabase gen types typescript --local > src/types/supabase.ts`
// ============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
        Relationships: [];
      };
      vendors: {
        Row: Vendor;
        Insert: VendorInsert;
        Update: VendorUpdate;
        Relationships: [];
      };
      orders: {
        Row: Order;
        Insert: OrderInsert;
        Update: OrderUpdate;
        Relationships: [];
      };
      vendor_targets: {
        Row: VendorTarget;
        Insert: VendorTargetInsert;
        Update: Partial<VendorTarget>;
        Relationships: [];
      };
      file_uploads: {
        Row: FileUpload;
        Insert: FileUploadInsert;
        Update: Partial<FileUpload>;
        Relationships: [];
      };
      production_schedules: {
        Row: ProductionSchedule;
        Insert: ProductionScheduleInsert;
        Update: ProductionScheduleUpdate;
        Relationships: [];
      };
      bom_items: {
        Row: BomItem;
        Insert: BomItemInsert;
        Update: BomItemUpdate;
        Relationships: [];
      };
      delivery_notes: {
        Row: DeliveryNote;
        Insert: DeliveryNoteInsert;
        Update: DeliveryNoteUpdate;
        Relationships: [];
      };
      delivery_items: {
        Row: DeliveryItem;
        Insert: DeliveryItemInsert;
        Update: DeliveryItemUpdate;
        Relationships: [];
      };
      material_settlements: {
        Row: MaterialSettlement;
        Insert: MaterialSettlementInsert;
        Update: MaterialSettlementUpdate;
        Relationships: [];
      };
      material_returns: {
        Row: MaterialReturn;
        Insert: MaterialReturnInsert;
        Update: MaterialReturnUpdate;
        Relationships: [];
      };
    };
    Views: {
      orders_with_schedule: {
        Row: OrderWithSchedule;
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      production_status: ProductionStatus;
      purchase_order_status: PurchaseOrderStatus;
      approval_status: ApprovalStatus;
      bom_status: BomStatus;
      delivery_progress_status: DeliveryProgressStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
