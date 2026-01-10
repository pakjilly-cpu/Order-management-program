-- ============================================
-- Seed Data
-- Order Management System - Supabase
-- ============================================

-- ============================================
-- 1. 외주처 데이터 삽입
-- ============================================
INSERT INTO vendors (name, code) VALUES
  ('위드맘', '200131'),
  ('그램', '200216'),
  ('리니어', '200101'),
  ('디딤테크', '308803'),
  ('씨엘로', '200008'),
  ('신세계', '200004'),
  ('엠큐브', '111111'),
  ('메이코스', '222222')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. 월간 목표 데이터 삽입
-- 현재 연도/월 기준으로 목표 설정
-- ============================================
INSERT INTO vendor_targets (vendor_id, target_quantity, year, month)
SELECT
  v.id,
  t.target,
  EXTRACT(YEAR FROM NOW())::INT,
  EXTRACT(MONTH FROM NOW())::INT
FROM vendors v
JOIN (VALUES
  ('그램', 480000),
  ('디딤테크', 1600000),
  ('리니어', 1600000),
  ('메이코스', 1000000),
  ('씨엘로', 1600000),
  ('엠큐브', 1000000),
  ('위드맘', 1600000)
) AS t(name, target) ON v.name = t.name
ON CONFLICT (vendor_id, year, month) DO UPDATE SET target_quantity = EXCLUDED.target_quantity;
