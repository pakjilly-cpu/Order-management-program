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

export type OrderInsert = Omit<Order, 'id' | 'created_at' | 'updated_at' | 'is_completed' | 'completed_at'> & {
  id?: string;
  is_completed?: boolean;
  completed_at?: string | null;
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
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
