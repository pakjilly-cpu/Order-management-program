-- ============================================
-- Migration: Add Production Schedule Feature
-- 생산계획표 기능 추가
-- ============================================

-- ============================================
-- 1. VENDORS 테이블에 CAPA 필드 추가
-- ============================================
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS daily_capacity INTEGER DEFAULT 5000,
ADD COLUMN IF NOT EXISTS line_count INTEGER DEFAULT 1;

COMMENT ON COLUMN vendors.daily_capacity IS '라인당 일일 생산능력 (수량)';
COMMENT ON COLUMN vendors.line_count IS '보유 생산라인 수';

-- ============================================
-- 2. PRODUCTION_SCHEDULES 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS production_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  
  -- 일정 관련
  start_date DATE NOT NULL,           -- 생산 시작일
  end_date DATE NOT NULL,             -- 생산 종료일
  
  -- 계산된 값
  transfer_date DATE,                 -- 이동일 (발주일 + 1)
  earliest_production_date DATE,      -- 최소 생산가능일 (이동일 + 1)
  
  -- 상태 관리
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'delayed')),
  
  -- 메타데이터
  is_manually_adjusted BOOLEAN DEFAULT false,  -- 수동 조정 여부 (드래그앤드롭)
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 하나의 주문에 하나의 스케줄만
  UNIQUE(order_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_production_schedules_vendor ON production_schedules(vendor_id);
CREATE INDEX IF NOT EXISTS idx_production_schedules_dates ON production_schedules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_production_schedules_status ON production_schedules(status);

-- updated_at 트리거
CREATE TRIGGER production_schedules_updated_at
  BEFORE UPDATE ON production_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS) 정책
-- ============================================

-- RLS 활성화
ALTER TABLE production_schedules ENABLE ROW LEVEL SECURITY;

-- 활성 사용자만 생산계획 조회 가능
CREATE POLICY "Active users can view production_schedules" ON production_schedules
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

-- 관리자만 생산계획 추가 가능
CREATE POLICY "Admin can insert production_schedules" ON production_schedules
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 활성 사용자는 생산계획 업데이트 가능 (드래그앤드롭 일정 변경)
CREATE POLICY "Active users can update production_schedules" ON production_schedules
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

-- 관리자만 생산계획 삭제 가능
CREATE POLICY "Admin can delete production_schedules" ON production_schedules
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- 4. VIEW: 주문 + 생산계획 조인
-- ============================================
CREATE OR REPLACE VIEW orders_with_schedule AS
SELECT 
  o.*,
  ps.id as schedule_id,
  ps.start_date as production_start_date,
  ps.end_date as production_end_date,
  ps.transfer_date,
  ps.earliest_production_date,
  ps.status as production_status,
  ps.is_manually_adjusted,
  v.name as vendor_name,
  v.code as vendor_code,
  v.daily_capacity,
  v.line_count
FROM orders o
LEFT JOIN production_schedules ps ON o.id = ps.order_id
LEFT JOIN vendors v ON o.vendor_id = v.id;
