-- ============================================
-- Migration 003: 외주임가공 기능 추가
-- orders 테이블에 PO 관련 컬럼 추가
-- BOM, 납품서, 자재정산, 자재환입 테이블 생성
-- ============================================

-- ============================================
-- 1. ORDERS 테이블에 PO 관련 컬럼 추가
-- ============================================
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS po_number TEXT,
ADD COLUMN IF NOT EXISTS item_number TEXT,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'EA',
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KRW',
ADD COLUMN IF NOT EXISTS price_unit INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS request_date DATE,
ADD COLUMN IF NOT EXISTS received_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS warehouse TEXT,
ADD COLUMN IF NOT EXISTS cosmax_comment TEXT,
ADD COLUMN IF NOT EXISTS customer_code TEXT,
ADD COLUMN IF NOT EXISTS po_status TEXT DEFAULT 'pending' CHECK (po_status IN ('pending', 'confirmed', 'changed', 'completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS is_delivery_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS packaging_image_url TEXT,
ADD COLUMN IF NOT EXISTS product_image_url TEXT,
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_orders_po_number ON orders(po_number);
CREATE INDEX IF NOT EXISTS idx_orders_po_status ON orders(po_status);
CREATE INDEX IF NOT EXISTS idx_orders_approval_status ON orders(approval_status);

-- ============================================
-- 2. BOM_ITEMS (BOM 입고현황) 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS bom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  manager_name TEXT,
  instruction_date DATE,
  supplier_code TEXT,
  supplier_name TEXT,
  purchase_document TEXT,
  parent_material_code TEXT,
  parent_material_name TEXT,
  purchase_quantity NUMERIC(12,2) DEFAULT 0,
  purchase_unit TEXT DEFAULT 'EA',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'partial', 'shortage')),
  child_material_code TEXT,
  child_material_name TEXT,
  required_quantity NUMERIC(12,2) DEFAULT 0,
  required_unit TEXT DEFAULT 'EA',
  vendor_stock NUMERIC(12,2) DEFAULT 0,
  shortage_quantity NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bom_vendor ON bom_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bom_order ON bom_items(order_id);

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
  delivery_number TEXT UNIQUE,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_completed BOOLEAN DEFAULT false,
  warehouse TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dn_vendor ON delivery_notes(vendor_id);
CREATE INDEX IF NOT EXISTS idx_dn_date ON delivery_notes(delivery_date);

CREATE TRIGGER delivery_notes_updated_at
  BEFORE UPDATE ON delivery_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_code TEXT,
  product_code TEXT,
  product_name TEXT NOT NULL,
  po_number TEXT,
  po_item_number TEXT,
  po_quantity INTEGER DEFAULT 0,
  previously_received INTEGER DEFAULT 0,
  delivery_allowed INTEGER DEFAULT 0,
  cosmax_comment TEXT,
  progress_status TEXT DEFAULT 'pending' CHECK (progress_status IN ('pending', 'in_progress', 'completed', 'rejected')),
  pallet_count INTEGER DEFAULT 0,
  items_per_box INTEGER DEFAULT 0,
  box_count INTEGER DEFAULT 0,
  remainder INTEGER DEFAULT 0,
  production_date DATE,
  lot_number TEXT,
  received_quantity INTEGER DEFAULT 0,
  managed_product BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
CREATE INDEX IF NOT EXISTS idx_di_order ON delivery_items(order_id);

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
  po_number TEXT,
  po_item_number TEXT,
  product_code TEXT,
  product_name TEXT,
  material_code TEXT,
  material_name TEXT,
  lot_number TEXT,
  original_quantity NUMERIC(12,2) DEFAULT 0,
  normal_usage NUMERIC(12,2) DEFAULT 0,
  damaged_usage NUMERIC(12,2) DEFAULT 0,
  remaining_stock NUMERIC(12,2) DEFAULT 0,
  is_registered BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ms_vendor ON material_settlements(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ms_po ON material_settlements(po_number);

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
  material_code TEXT NOT NULL,
  material_name TEXT,
  stock_quantity NUMERIC(12,2) DEFAULT 0,
  lot_number TEXT,
  settlement_return NUMERIC(12,2) DEFAULT 0,
  warehouse TEXT,
  notes TEXT,
  bulk_ratio NUMERIC(8,4),
  is_return_target BOOLEAN DEFAULT false,
  manufacture_date DATE,
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

ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active users can view bom_items" ON bom_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true));
CREATE POLICY "Admin can manage bom_items" ON bom_items
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active users can view delivery_notes" ON delivery_notes
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true));
CREATE POLICY "Active users can manage delivery_notes" ON delivery_notes
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true));

ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active users can view delivery_items" ON delivery_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true));
CREATE POLICY "Active users can manage delivery_items" ON delivery_items
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true));

ALTER TABLE material_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active users can view material_settlements" ON material_settlements
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true));
CREATE POLICY "Active users can manage material_settlements" ON material_settlements
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true));

ALTER TABLE material_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active users can view material_returns" ON material_returns
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true));
CREATE POLICY "Active users can manage material_returns" ON material_returns
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true));
