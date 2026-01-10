-- ============================================
-- Initial Schema Migration
-- Order Management System - Supabase
-- ============================================

-- ============================================
-- 1. USERS 테이블
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY,  -- Supabase Auth의 user.id와 동일
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 첫 번째 가입자 자동 admin 트리거 함수
CREATE OR REPLACE FUNCTION set_first_user_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM users) = 0 THEN
    NEW.role := 'admin';
    NEW.is_active := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 첫 번째 사용자 admin 설정 트리거
CREATE TRIGGER first_user_admin
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_first_user_as_admin();

-- updated_at 자동 갱신 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- users 테이블 updated_at 트리거
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. VENDORS 테이블
-- ============================================
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL CHECK (LENGTH(code) = 6),
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- vendors 테이블 updated_at 트리거
CREATE TRIGGER vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. ORDERS 테이블
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_code TEXT,
  quantity INTEGER NOT NULL,
  delivery_date DATE,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- orders 테이블 인덱스
CREATE INDEX idx_orders_vendor ON orders(vendor_id);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_product_code ON orders(product_code);

-- orders 테이블 updated_at 트리거
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. VENDOR_TARGETS 테이블
-- ============================================
CREATE TABLE vendor_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  target_quantity INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, year, month)
);

-- ============================================
-- 5. FILE_UPLOADS 테이블
-- ============================================
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  order_count INTEGER NOT NULL,
  order_date DATE NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS) 정책
-- ============================================

-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6.1 USERS 테이블 RLS 정책
-- ============================================

-- 관리자는 모든 사용자 관리 가능
CREATE POLICY "Admin can manage users" ON users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 사용자는 본인 정보만 조회 가능
CREATE POLICY "Users can view self" ON users
  FOR SELECT USING (auth.uid() = id);

-- ============================================
-- 6.2 VENDORS 테이블 RLS 정책
-- ============================================

-- 활성 사용자만 외주처 목록 조회 가능
CREATE POLICY "Active users can view vendors" ON vendors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

-- 관리자만 외주처 관리 가능 (INSERT, UPDATE, DELETE)
CREATE POLICY "Admin can manage vendors" ON vendors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 6.3 ORDERS 테이블 RLS 정책
-- ============================================

-- 활성 사용자만 주문 조회 가능
CREATE POLICY "Active users can view orders" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

-- 관리자만 주문 추가 가능
CREATE POLICY "Admin can insert orders" ON orders
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 관리자만 주문 삭제 가능
CREATE POLICY "Admin can delete orders" ON orders
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 활성 사용자는 주문 완료 상태 업데이트 가능
CREATE POLICY "Active users can update orders" ON orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

-- ============================================
-- 6.4 VENDOR_TARGETS 테이블 RLS 정책
-- ============================================

-- 활성 사용자만 목표 조회 가능
CREATE POLICY "Active users can view vendor_targets" ON vendor_targets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

-- 관리자만 목표 관리 가능
CREATE POLICY "Admin can manage vendor_targets" ON vendor_targets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 6.5 FILE_UPLOADS 테이블 RLS 정책
-- ============================================

-- 활성 사용자만 업로드 이력 조회 가능
CREATE POLICY "Active users can view file_uploads" ON file_uploads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

-- 관리자만 업로드 이력 추가 가능
CREATE POLICY "Admin can insert file_uploads" ON file_uploads
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 관리자만 업로드 이력 삭제 가능
CREATE POLICY "Admin can delete file_uploads" ON file_uploads
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
