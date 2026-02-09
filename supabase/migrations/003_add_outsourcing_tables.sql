-- ============================================
-- Migration: 외주임가공 기능 추가
-- 발주서, BOM, 납품서, 자재정산, 자재환입
-- ============================================

-- ============================================
-- 1. PURCHASE_ORDERS (발주서) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,              -- PO번호
  item_number TEXT,                     -- 품번
  product_code TEXT,                    -- 품목코드
  product_name TEXT NOT NULL,           -- 품목명
  po_date DATE NOT NULL DEFAULT CURRENT_DATE,  -- PO 생성일
  po_quantity INTEGER NOT NULL DEFAULT 0,      -- PO수량
  unit TEXT DEFAULT 'EA',               -- 단위
  unit_price NUMERIC(12,2) DEFAULT 0,   -- 단가
  currency TEXT DEFAULT 'KRW',          -- 통화단위
  price_unit INTEGER DEFAULT 1,         -- 가격단위
  request_date DATE,                    -- 입고 요청일
  received_quantity INTEGER DEFAULT 0,  -- 기입고수량
  remaining_quantity INTEGER DEFAULT 0, -- 이입고수량 (미입고수량)
  warehouse TEXT,                       -- 납품창고
  cosmax_comment TEXT,                  -- 코스맥스 의견
  customer_code TEXT,                   -- 고객사목록코드
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'changed', 'completed', 'cancelled')),
  is_delivery_completed BOOLEAN DEFAULT false, -- 납품완료 여부
  packaging_image_url TEXT,             -- 포장이미지
  product_image_url TEXT,               -- 기존 제품 이미지
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_po_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_po_date ON purchase_orders(po_date);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_product_code ON purchase_orders(product_code);

CREATE TRIGGER purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. BOM_ITEMS (BOM 입고현황) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS bom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  manager_name TEXT,                    -- 담당자
  instruction_date DATE,                -- 지시일
  supplier_code TEXT,                   -- 공급업체 코드
  supplier_name TEXT,                   -- 공급업체명
  purchase_document TEXT,               -- 구매문서
  parent_material_code TEXT,            -- 상위자재코드
  parent_material_name TEXT,            -- 상위자재내역
  purchase_quantity NUMERIC(12,2) DEFAULT 0, -- 구매수량
  purchase_unit TEXT DEFAULT 'EA',      -- 구매단위
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'partial', 'shortage')),
  child_material_code TEXT,             -- 하위자재코드
  child_material_name TEXT,             -- 하위자재내역
  required_quantity NUMERIC(12,2) DEFAULT 0, -- 소요량
  required_unit TEXT DEFAULT 'EA',      -- 소요단위
  vendor_stock NUMERIC(12,2) DEFAULT 0, -- 업체재고
  shortage_quantity NUMERIC(12,2) DEFAULT 0, -- 과부족수량
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bom_vendor ON bom_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bom_po ON bom_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_bom_parent_code ON bom_items(parent_material_code);
CREATE INDEX IF NOT EXISTS idx_bom_child_code ON bom_items(child_material_code);

CREATE TRIGGER bom_items_updated_at
  BEFORE UPDATE ON bom_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. DELIVERY_NOTES (납품서) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  delivery_number TEXT UNIQUE,          -- 납품번호 (자동생성)
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE, -- 납품일
  is_completed BOOLEAN DEFAULT false,   -- 납품완료 여부
  warehouse TEXT,                       -- 납품창고
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dn_vendor ON delivery_notes(vendor_id);
CREATE INDEX IF NOT EXISTS idx_dn_date ON delivery_notes(delivery_date);
CREATE INDEX IF NOT EXISTS idx_dn_number ON delivery_notes(delivery_number);

CREATE TRIGGER delivery_notes_updated_at
  BEFORE UPDATE ON delivery_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 납품번호 자동생성 함수 (DN-YYYYMMDD-NNN 형식)
CREATE OR REPLACE FUNCTION generate_delivery_number()
RETURNS TRIGGER AS $$
DECLARE
  seq_num INTEGER;
  date_str TEXT;
BEGIN
  date_str := TO_CHAR(NEW.delivery_date, 'YYYYMMDD');
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(delivery_number FROM 'DN-' || date_str || '-(\d+)') AS INTEGER)
  ), 0) + 1 INTO seq_num
  FROM delivery_notes
  WHERE delivery_number LIKE 'DN-' || date_str || '-%';
  
  NEW.delivery_number := 'DN-' || date_str || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_delivery_number
  BEFORE INSERT ON delivery_notes
  FOR EACH ROW
  WHEN (NEW.delivery_number IS NULL)
  EXECUTE FUNCTION generate_delivery_number();

-- ============================================
-- 4. DELIVERY_ITEMS (납품서 항목) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id UUID NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  customer_code TEXT,                   -- 고객사 코드
  product_code TEXT,                    -- 제품코드
  product_name TEXT NOT NULL,           -- 제품명
  po_number TEXT,                       -- PO 번호
  po_item_number TEXT,                  -- PO 품번
  po_quantity INTEGER DEFAULT 0,        -- PO 수량
  previously_received INTEGER DEFAULT 0, -- 기입고수량
  delivery_allowed INTEGER DEFAULT 0,   -- 납품허용
  cosmax_comment TEXT,                  -- 코스맥스 의견
  progress_status TEXT DEFAULT 'pending' CHECK (progress_status IN ('pending', 'in_progress', 'completed', 'rejected')),
  pallet_count INTEGER DEFAULT 0,       -- 파레트수
  items_per_box INTEGER DEFAULT 0,      -- 박스당 제품수
  box_count INTEGER DEFAULT 0,          -- 박스수
  remainder INTEGER DEFAULT 0,          -- 날계
  production_date DATE,                 -- 생산날짜
  lot_number TEXT,                      -- LOT
  received_quantity INTEGER DEFAULT 0,  -- 입고수량 = (박스당제품수 × 박스수) + 날계
  managed_product BOOLEAN DEFAULT false, -- 관리품
  notes TEXT,                           -- 비고
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- received_quantity 자동 계산 트리거
CREATE OR REPLACE FUNCTION calc_received_quantity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.received_quantity := (COALESCE(NEW.items_per_box, 0) * COALESCE(NEW.box_count, 0)) + COALESCE(NEW.remainder, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calc_received
  BEFORE INSERT OR UPDATE ON delivery_items
  FOR EACH ROW
  EXECUTE FUNCTION calc_received_quantity();

CREATE INDEX IF NOT EXISTS idx_di_note ON delivery_items(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_di_po ON delivery_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_di_product_code ON delivery_items(product_code);

CREATE TRIGGER delivery_items_updated_at
  BEFORE UPDATE ON delivery_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. MATERIAL_SETTLEMENTS (자재정산) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS material_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  delivery_note_id UUID REFERENCES delivery_notes(id) ON DELETE SET NULL,
  po_number TEXT,                       -- PO번호
  po_item_number TEXT,                  -- PO항번
  product_code TEXT,                    -- 제품코드
  product_name TEXT,                    -- 제품명
  material_code TEXT,                   -- 자재코드
  material_name TEXT,                   -- 자재명
  lot_number TEXT,                      -- LOT번호
  original_quantity NUMERIC(12,2) DEFAULT 0,  -- 원수량
  normal_usage NUMERIC(12,2) DEFAULT 0,       -- 정상사용
  damaged_usage NUMERIC(12,2) DEFAULT 0,      -- 사용파손
  remaining_stock NUMERIC(12,2) DEFAULT 0,    -- 잔여재고량
  is_registered BOOLEAN DEFAULT false,  -- 등록여부
  notes TEXT,                           -- 비고
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ms_vendor ON material_settlements(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ms_po ON material_settlements(po_number);
CREATE INDEX IF NOT EXISTS idx_ms_material ON material_settlements(material_code);
CREATE INDEX IF NOT EXISTS idx_ms_product ON material_settlements(product_code);

CREATE TRIGGER material_settlements_updated_at
  BEFORE UPDATE ON material_settlements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. MATERIAL_RETURNS (자재환입) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS material_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  material_code TEXT NOT NULL,          -- 자재코드
  material_name TEXT,                   -- 자재명
  stock_quantity NUMERIC(12,2) DEFAULT 0, -- 재고
  lot_number TEXT,                      -- LOT번호
  settlement_return NUMERIC(12,2) DEFAULT 0, -- 정산환입
  warehouse TEXT,                       -- 납품창고
  notes TEXT,                           -- 비고
  bulk_ratio NUMERIC(8,4),              -- 벌크 비중
  is_return_target BOOLEAN DEFAULT false, -- 환입대상
  manufacture_date DATE,                -- 제조일
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mr_vendor ON material_returns(vendor_id);
CREATE INDEX IF NOT EXISTS idx_mr_material ON material_returns(material_code);

CREATE TRIGGER material_returns_updated_at
  BEFORE UPDATE ON material_returns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. RLS 정책
-- ============================================

-- purchase_orders
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view purchase_orders" ON purchase_orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Admin can manage purchase_orders" ON purchase_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- bom_items
ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view bom_items" ON bom_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Admin can manage bom_items" ON bom_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- delivery_notes
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view delivery_notes" ON delivery_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Active users can manage delivery_notes" ON delivery_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

-- delivery_items
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view delivery_items" ON delivery_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Active users can manage delivery_items" ON delivery_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

-- material_settlements
ALTER TABLE material_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view material_settlements" ON material_settlements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Active users can manage material_settlements" ON material_settlements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

-- material_returns
ALTER TABLE material_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view material_returns" ON material_returns
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Active users can manage material_returns" ON material_returns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );
