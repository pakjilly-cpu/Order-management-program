export interface OrderItem {
  id: string;
  productName: string;
  quantity: string;
  vendorName: string;
  deliveryDate?: string; // 납기요청일
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
