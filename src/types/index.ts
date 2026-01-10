export interface OrderItem {
  id: string;
  productName: string;
  productCode?: string; // 제품코드 (F열)
  quantity: string;
  vendorName: string;
  deliveryDate?: string; // 납기요청일
  orderDate?: string; // 발주일 (파일 업로드 날짜)
  isCompleted: boolean;
  notes?: string;
}

export interface VendorGroup {
  vendorName: string;
  items: OrderItem[];
  code: string; // 6-digit Login Code
}

export enum AppView {
  LOGIN = 'LOGIN',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  VENDOR_PORTAL = 'VENDOR_PORTAL',
}

export interface User {
  type: 'ADMIN' | 'VENDOR';
  id: string; // Admin ID or Vendor Name
  name?: string;
}

// ============================================
// Auth Types (Supabase Auth와 연동)
// ============================================

import { User as DbUser } from '@/types/database';

export interface AuthState {
  user: DbUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
