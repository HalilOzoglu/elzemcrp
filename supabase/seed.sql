-- ============================================================
-- Elzem İletişim POS/ERP — Seed Data
-- Supabase SQL Editor'da çalıştırın
-- ============================================================

DO $$
DECLARE
  -- Brands
  b_samsung UUID := 'a0000001-0000-0000-0000-000000000001';
  b_apple   UUID := 'a0000001-0000-0000-0000-000000000002';
  b_xiaomi  UUID := 'a0000001-0000-0000-0000-000000000003';

  -- Models
  m_s24     UUID := 'a0000002-0000-0000-0000-000000000001';
  m_a55     UUID := 'a0000002-0000-0000-0000-000000000002';
  m_ip15    UUID := 'a0000002-0000-0000-0000-000000000003';
  m_ip15pro UUID := 'a0000002-0000-0000-0000-000000000004';
  m_rn13    UUID := 'a0000002-0000-0000-0000-000000000005';

  -- Variants
  v_s24_blk UUID := 'a0000003-0000-0000-0000-000000000001';
  v_s24_wht UUID := 'a0000003-0000-0000-0000-000000000002';
  v_s24_pur UUID := 'a0000003-0000-0000-0000-000000000003';
  v_a55_blu UUID := 'a0000003-0000-0000-0000-000000000004';
  v_a55_blk UUID := 'a0000003-0000-0000-0000-000000000005';
  v_ip15_blk UUID := 'a0000003-0000-0000-0000-000000000006';
  v_ip15_blu UUID := 'a0000003-0000-0000-0000-000000000007';
  v_ip15p_tb UUID := 'a0000003-0000-0000-0000-000000000008';
  v_ip15p_tw UUID := 'a0000003-0000-0000-0000-000000000009';
  v_rn13_blk UUID := 'a0000003-0000-0000-0000-000000000010';
  v_rn13_blu UUID := 'a0000003-0000-0000-0000-000000000011';

  -- Contacts
  c_ahmet   UUID := 'a0000004-0000-0000-0000-000000000001';
  c_fatma   UUID := 'a0000004-0000-0000-0000-000000000002';
  c_mehmet  UUID := 'a0000004-0000-0000-0000-000000000003';
  c_ayse    UUID := 'a0000004-0000-0000-0000-000000000004';
  c_tekno   UUID := 'a0000004-0000-0000-0000-000000000005';
  c_mobil   UUID := 'a0000004-0000-0000-0000-000000000006';

  -- Devices (IN_STOCK)
  d1 UUID := 'a0000005-0000-0000-0000-000000000001';
  d2 UUID := 'a0000005-0000-0000-0000-000000000002';
  d3 UUID := 'a0000005-0000-0000-0000-000000000003';
  d4 UUID := 'a0000005-0000-0000-0000-000000000004';
  d5 UUID := 'a0000005-0000-0000-0000-000000000005';
  d6 UUID := 'a0000005-0000-0000-0000-000000000006';
  d7 UUID := 'a0000005-0000-0000-0000-000000000007';
  d8 UUID := 'a0000005-0000-0000-0000-000000000008';
  d9 UUID := 'a0000005-0000-0000-0000-000000000009';
  d10 UUID := 'a0000005-0000-0000-0000-000000000010';

  -- Devices (SOLD)
  d11 UUID := 'a0000005-0000-0000-0000-000000000011';
  d12 UUID := 'a0000005-0000-0000-0000-000000000012';
  d13 UUID := 'a0000005-0000-0000-0000-000000000013';
  d14 UUID := 'a0000005-0000-0000-0000-000000000014';
  d15 UUID := 'a0000005-0000-0000-0000-000000000015';

  -- Accessories
  acc1  UUID := 'a0000006-0000-0000-0000-000000000001';
  acc2  UUID := 'a0000006-0000-0000-0000-000000000002';
  acc3  UUID := 'a0000006-0000-0000-0000-000000000003';
  acc4  UUID := 'a0000006-0000-0000-0000-000000000004';
  acc5  UUID := 'a0000006-0000-0000-0000-000000000005';
  acc6  UUID := 'a0000006-0000-0000-0000-000000000006';
  acc7  UUID := 'a0000006-0000-0000-0000-000000000007';
  acc8  UUID := 'a0000006-0000-0000-0000-000000000008';
  acc9  UUID := 'a0000006-0000-0000-0000-000000000009';
  acc10 UUID := 'a0000006-0000-0000-0000-000000000010';

BEGIN

  -- ─── Brands ────────────────────────────────────────────────
  INSERT INTO brands (id, name) VALUES
    (b_samsung, 'Samsung'),
    (b_apple,   'Apple'),
    (b_xiaomi,  'Xiaomi')
  ON CONFLICT (id) DO NOTHING;

  -- ─── Models ────────────────────────────────────────────────
  INSERT INTO models (id, brand_id, name) VALUES
    (m_s24,     b_samsung, 'Galaxy S24'),
    (m_a55,     b_samsung, 'Galaxy A55'),
    (m_ip15,    b_apple,   'iPhone 15'),
    (m_ip15pro, b_apple,   'iPhone 15 Pro'),
    (m_rn13,    b_xiaomi,  'Redmi Note 13')
  ON CONFLICT (id) DO NOTHING;

  -- ─── Model Variants ────────────────────────────────────────
  INSERT INTO model_variants (id, model_id, color, storage) VALUES
    (v_s24_blk,  m_s24,     'Siyah',          '256GB'),
    (v_s24_wht,  m_s24,     'Beyaz',          '256GB'),
    (v_s24_pur,  m_s24,     'Mor',            '512GB'),
    (v_a55_blu,  m_a55,     'Mavi',           '128GB'),
    (v_a55_blk,  m_a55,     'Siyah',          '256GB'),
    (v_ip15_blk, m_ip15,    'Siyah',          '128GB'),
    (v_ip15_blu, m_ip15,    'Mavi',           '256GB'),
    (v_ip15p_tb, m_ip15pro, 'Titanyum Siyah', '256GB'),
    (v_ip15p_tw, m_ip15pro, 'Titanyum Beyaz', '512GB'),
    (v_rn13_blk, m_rn13,    'Siyah',          '128GB'),
    (v_rn13_blu, m_rn13,    'Mavi',           '256GB')
  ON CONFLICT (id) DO NOTHING;

  -- ─── Contacts ──────────────────────────────────────────────
  INSERT INTO contacts (id, full_name, phone, contact_type) VALUES
    (c_ahmet,  'Ahmet Yılmaz',   '0532 111 2233', 'CUSTOMER'),
    (c_fatma,  'Fatma Kaya',     '0541 222 3344', 'CUSTOMER'),
    (c_mehmet, 'Mehmet Demir',   '0555 333 4455', 'CUSTOMER'),
    (c_ayse,   'Ayşe Çelik',     '0506 444 5566', 'CUSTOMER'),
    (c_tekno,  'Teknoloji A.Ş.', '0212 500 6677', 'SUPPLIER'),
    (c_mobil,  'Mobil Dağıtım',  '0216 600 7788', 'SUPPLIER')
  ON CONFLICT (id) DO NOTHING;

  -- ─── Devices (IN_STOCK) ────────────────────────────────────
  INSERT INTO devices (id, variant_id, is_dual_sim, imei_1, imei_2, purchase_price, recommended_sale_price, status, is_foreign, is_new, has_box, has_invoice) VALUES
    (d1,  v_s24_blk,  true,  '351234567890001', '351234567890002', 18500, 22999, 'IN_STOCK', false, true, true, true),
    (d2,  v_s24_wht,  true,  '351234567890003', '351234567890004', 18500, 22999, 'IN_STOCK', false, true, true, true),
    (d3,  v_s24_pur,  true,  '351234567890005', '351234567890006', 21000, 26999, 'IN_STOCK', false, true, true, true),
    (d4,  v_a55_blu,  true,  '351234567890007', '351234567890008', 12000, 15999, 'IN_STOCK', false, true, true, false),
    (d5,  v_ip15_blk, false, '351234567890009', NULL,              28000, 34999, 'IN_STOCK', false, true, true, true),
    (d6,  v_ip15_blu, false, '351234567890010', NULL,              28000, 34999, 'IN_STOCK', false, true, true, true),
    (d7,  v_ip15p_tb, false, '351234567890011', NULL,              42000, 52999, 'IN_STOCK', false, true, true, true),
    (d8,  v_ip15p_tw, false, '351234567890012', NULL,              48000, 59999, 'IN_STOCK', false, true, true, true),
    (d9,  v_rn13_blk, true,  '351234567890013', '351234567890014', 8500,  11999, 'IN_STOCK', false, true, true, false),
    (d10, v_rn13_blu, true,  '351234567890015', '351234567890016', 9500,  12999, 'IN_STOCK', false, true, true, false)
  ON CONFLICT (id) DO NOTHING;

  -- ─── Devices (SOLD) ────────────────────────────────────────
  INSERT INTO devices (id, variant_id, is_dual_sim, imei_1, imei_2, purchase_price, recommended_sale_price, status, is_foreign, is_new, has_box, has_invoice) VALUES
    (d11, v_a55_blk,  true,  '351234567890017', '351234567890018', 12000, 15999, 'SOLD', false, true, true, false),
    (d12, v_ip15_blk, false, '351234567890019', NULL,              27000, 33999, 'SOLD', false, true, true, true),
    (d13, v_s24_wht,  true,  '351234567890020', '351234567890021', 18000, 22999, 'SOLD', false, true, true, true),
    (d14, v_ip15p_tb, false, '351234567890022', NULL,              41000, 52999, 'SOLD', false, true, true, true),
    (d15, v_rn13_blk, true,  '351234567890023', '351234567890024',  8200, 11999, 'SOLD', false, true, true, false)
  ON CONFLICT (id) DO NOTHING;

  -- ─── Device Expenses ───────────────────────────────────────
  INSERT INTO device_expenses (device_id, expense_name, amount, expense_date) VALUES
    (d1,  'Kargo',  150, CURRENT_DATE - 5),
    (d7,  'Kargo',  200, CURRENT_DATE - 10),
    (d7,  'Gümrük', 500, CURRENT_DATE - 10)
  ON CONFLICT DO NOTHING;

  -- ─── Accessories ───────────────────────────────────────────
  INSERT INTO accessories (id, barcode, brand, category, purchase_price, sale_price, stock_quantity) VALUES
    (acc1,  '8690000000001', 'Samsung', 'Kablo',           80,  199, 25),
    (acc2,  '8690000000002', 'Apple',   'Kablo',           90,  229, 18),
    (acc3,  '8690000000003', 'Genel',   'Adaptör',        120,  299, 30),
    (acc4,  '8690000000004', 'Samsung', 'Kılıf',           60,  149, 15),
    (acc5,  '8690000000005', 'Apple',   'Kılıf',           70,  169, 12),
    (acc6,  '8690000000006', 'Genel',   'Ekran Koruyucu',  30,   79, 40),
    (acc7,  '8690000000007', 'JBL',     'Kulaklık',       350,  799,  8),
    (acc8,  '8690000000008', 'Xiaomi',  'Powerbank',      280,  649,  5),
    (acc9,  '8690000000009', 'Genel',   'Araç Tutucu',     90,  199,  3),
    (acc10, '8690000000010', 'Genel',   'Şarj Pedi',      200,  449,  2)
  ON CONFLICT (id) DO NOTHING;

  -- ─── Sales ─────────────────────────────────────────────────
  INSERT INTO sales (id, device_id, customer_id, sale_price, sale_date, payment_method, invoice_type) VALUES
    ('a0000007-0000-0000-0000-000000000001', d11, c_ahmet,  15500, CURRENT_DATE - 35, 'CASH',        'MF'),
    ('a0000007-0000-0000-0000-000000000002', d12, c_fatma,  33000, CURRENT_DATE - 28, 'CREDIT_CARD', 'MF'),
    ('a0000007-0000-0000-0000-000000000003', d13, c_mehmet, 22500, CURRENT_DATE - 10, 'CASH',        NULL),
    ('a0000007-0000-0000-0000-000000000004', d14, NULL,     51000, CURRENT_DATE - 5,  'CASH',        NULL),
    ('a0000007-0000-0000-0000-000000000005', d15, c_ayse,   11500, CURRENT_DATE - 2,  'IBAN',        'AF')
  ON CONFLICT (id) DO NOTHING;

END $$;
