-- =============================================================================
-- Alpha Fuel Manager - CLEAN Schema Migration (Run this in Supabase SQL Editor)
-- Drop any partial tables first, then recreate in correct dependency order
-- =============================================================================

-- Step 1: Drop everything cleanly (safe - only drops fuel_ tables)
DROP TABLE IF EXISTS fuel_settings CASCADE;
DROP TABLE IF EXISTS fuel_audit_log CASCADE;
DROP TABLE IF EXISTS fuel_sms_log CASCADE;
DROP TABLE IF EXISTS fuel_bank_transactions CASCADE;
DROP TABLE IF EXISTS fuel_bank_imports CASCADE;
DROP TABLE IF EXISTS fuel_inventory_log CASCADE;
DROP TABLE IF EXISTS fuel_inventory CASCADE;
DROP TABLE IF EXISTS fuel_stk_push_requests CASCADE;
DROP TABLE IF EXISTS fuel_payments CASCADE;
DROP TABLE IF EXISTS fuel_sales CASCADE;
DROP TABLE IF EXISTS fuel_shifts CASCADE;
DROP TABLE IF EXISTS fuel_fuel_prices CASCADE;
DROP TABLE IF EXISTS fuel_fuel_types CASCADE;
DROP TABLE IF EXISTS fuel_customers CASCADE;
DROP TABLE IF EXISTS fuel_users CASCADE;

-- Drop sequences if they exist
DROP SEQUENCE IF EXISTS fuel_customer_code_seq CASCADE;

-- Step 2: Create sequences
CREATE SEQUENCE IF NOT EXISTS fuel_customer_code_seq START 1;

-- =============================================================================
-- TABLE 1: fuel_users
-- NOTE: No FK to auth.users - we manage this independently for simplicity
-- Role is stored in Supabase Auth app_metadata and mirrored here
-- =============================================================================
CREATE TABLE fuel_users (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id     uuid        UNIQUE,
  full_name   text        NOT NULL,
  email       text        NOT NULL UNIQUE,
  role        text        NOT NULL DEFAULT 'attendant'
                          CHECK (role IN ('dealer_admin', 'accountant', 'attendant')),
  phone       text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fuel_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_users_all_authenticated"
  ON fuel_users FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TABLE 2: fuel_customers
-- =============================================================================
CREATE TABLE fuel_customers (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code       text          NOT NULL UNIQUE DEFAULT ('FC' || lpad(nextval('fuel_customer_code_seq')::text, 4, '0')),
  full_name           text          NOT NULL,
  phone               varchar(20)   NOT NULL UNIQUE,
  email               text,
  company_name        text,
  credit_limit        numeric(15,2) NOT NULL DEFAULT 0,
  outstanding_balance numeric(15,2) NOT NULL DEFAULT 0,
  is_active           boolean       NOT NULL DEFAULT true,
  notes               text,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_fuel_customers_phone ON fuel_customers (phone);
CREATE INDEX idx_fuel_customers_active ON fuel_customers (is_active);

ALTER TABLE fuel_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_customers_all_authenticated"
  ON fuel_customers FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TABLE 3: fuel_fuel_types
-- =============================================================================
CREATE TABLE fuel_fuel_types (
  id                         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                       text          NOT NULL UNIQUE
                             CHECK (name IN ('petrol', 'diesel', 'kerosene', 'premium_diesel')),
  current_price_per_litre    numeric(10,2) NOT NULL DEFAULT 0,
  low_stock_threshold_litres numeric(10,2) NOT NULL DEFAULT 500,
  is_active                  boolean       NOT NULL DEFAULT true,
  created_at                 timestamptz   NOT NULL DEFAULT now(),
  updated_at                 timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE fuel_fuel_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_fuel_types_all_authenticated"
  ON fuel_fuel_types FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TABLE 4: fuel_fuel_prices (price history)
-- =============================================================================
CREATE TABLE fuel_fuel_prices (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_type_id    uuid          NOT NULL REFERENCES fuel_fuel_types(id) ON DELETE CASCADE,
  price_per_litre numeric(10,2) NOT NULL,
  effective_from  timestamptz   NOT NULL DEFAULT now(),
  changed_by_id   uuid          REFERENCES fuel_users(id) ON DELETE SET NULL,
  changed_by_name text,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE fuel_fuel_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_fuel_prices_all_authenticated"
  ON fuel_fuel_prices FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TABLE 5: fuel_shifts
-- =============================================================================
CREATE TABLE fuel_shifts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  attendant_id uuid        REFERENCES fuel_users(id) ON DELETE SET NULL,
  attendant_name text,
  started_at   timestamptz NOT NULL DEFAULT now(),
  ended_at     timestamptz,
  status       text        NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'closed')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fuel_shifts_attendant ON fuel_shifts (attendant_id);
CREATE INDEX idx_fuel_shifts_status ON fuel_shifts (status);

ALTER TABLE fuel_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_shifts_all_authenticated"
  ON fuel_shifts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TABLE 6: fuel_sales
-- =============================================================================
CREATE TABLE fuel_sales (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number     text          NOT NULL UNIQUE DEFAULT ('FS-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random()*99999+1)::text, 5, '0')),
  customer_id     uuid          NOT NULL REFERENCES fuel_customers(id) ON DELETE RESTRICT,
  fuel_type_id    uuid          NOT NULL REFERENCES fuel_fuel_types(id) ON DELETE RESTRICT,
  quantity_litres numeric(10,3) NOT NULL CHECK (quantity_litres > 0),
  unit_price      numeric(10,2) NOT NULL CHECK (unit_price > 0),
  total_amount    numeric(15,2) GENERATED ALWAYS AS (quantity_litres * unit_price) STORED,
  sale_type       text          NOT NULL CHECK (sale_type IN ('pay_now', 'credit')),
  payment_channel text          CHECK (payment_channel IN (
                    'mpesa_paybill','mpesa_till','mpesa_stk',
                    'pesalink','eft_rtgs','bank_deposit','cash')),
  shift_id        uuid          REFERENCES fuel_shifts(id) ON DELETE SET NULL,
  attendant_id    uuid          REFERENCES fuel_users(id) ON DELETE SET NULL,
  attendant_name  text,
  notes           text,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_fuel_sales_customer_id ON fuel_sales (customer_id);
CREATE INDEX idx_fuel_sales_created_at  ON fuel_sales (created_at DESC);
CREATE INDEX idx_fuel_sales_shift_id    ON fuel_sales (shift_id);
CREATE INDEX idx_fuel_sales_sale_type   ON fuel_sales (sale_type);

ALTER TABLE fuel_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_sales_all_authenticated"
  ON fuel_sales FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TABLE 7: fuel_payments
-- =============================================================================
CREATE TABLE fuel_payments (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number  text          NOT NULL UNIQUE DEFAULT ('FP-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random()*99999+1)::text, 5, '0')),
  customer_id     uuid          REFERENCES fuel_customers(id) ON DELETE SET NULL,
  amount          numeric(15,2) NOT NULL CHECK (amount > 0),
  channel         text          NOT NULL CHECK (channel IN (
                    'mpesa_paybill','mpesa_till','mpesa_stk',
                    'pesalink','eft_rtgs','bank_deposit','cash')),
  idempotency_key varchar(255)  NOT NULL UNIQUE,
  status          text          NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('reconciled', 'pending')),
  reconciled_by_id   uuid       REFERENCES fuel_users(id) ON DELETE SET NULL,
  reconciled_by_name text,
  reconciled_at   timestamptz,
  raw_reference   text,
  raw_narration   text,
  raw_phone       varchar(20),
  notes           text,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_fuel_payments_status      ON fuel_payments (status);
CREATE INDEX idx_fuel_payments_customer_id ON fuel_payments (customer_id);
CREATE INDEX idx_fuel_payments_created_at  ON fuel_payments (created_at DESC);

ALTER TABLE fuel_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_payments_all_authenticated"
  ON fuel_payments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TABLE 8: fuel_stk_push_requests
-- =============================================================================
CREATE TABLE fuel_stk_push_requests (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid          NOT NULL REFERENCES fuel_customers(id) ON DELETE RESTRICT,
  amount              numeric(15,2) NOT NULL CHECK (amount > 0),
  phone               varchar(20)   NOT NULL,
  checkout_request_id varchar(100)  UNIQUE,
  merchant_request_id varchar(100),
  status              text          NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','success','failed','cancelled')),
  initiated_by_id     uuid          REFERENCES fuel_users(id) ON DELETE SET NULL,
  initiated_by_name   text,
  payment_id          uuid          REFERENCES fuel_payments(id) ON DELETE SET NULL,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE fuel_stk_push_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_stk_push_requests_all_authenticated"
  ON fuel_stk_push_requests FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TABLE 9: fuel_inventory
-- =============================================================================
CREATE TABLE fuel_inventory (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_type_id uuid          NOT NULL UNIQUE REFERENCES fuel_fuel_types(id) ON DELETE RESTRICT,
  stock_litres numeric(12,3) NOT NULL DEFAULT 0 CHECK (stock_litres >= 0),
  updated_at   timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE fuel_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_inventory_all_authenticated"
  ON fuel_inventory FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TABLE 10: fuel_inventory_log
-- =============================================================================
CREATE TABLE fuel_inventory_log (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_type_id      uuid          NOT NULL REFERENCES fuel_fuel_types(id) ON DELETE RESTRICT,
  quantity_change   numeric(12,3) NOT NULL,
  resulting_balance numeric(12,3) NOT NULL,
  event_type        text          NOT NULL CHECK (event_type IN ('sale','delivery','adjustment')),
  reference_id      uuid,
  changed_by_id     uuid          REFERENCES fuel_users(id) ON DELETE SET NULL,
  changed_by_name   text,
  notes             text,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_fuel_inventory_log_fuel_type ON fuel_inventory_log (fuel_type_id);
CREATE INDEX idx_fuel_inventory_log_created   ON fuel_inventory_log (created_at DESC);

ALTER TABLE fuel_inventory_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_inventory_log_all_authenticated"
  ON fuel_inventory_log FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TABLE 11: fuel_bank_imports
-- =============================================================================
CREATE TABLE fuel_bank_imports (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  filename     text        NOT NULL,
  sha256_hash  varchar(64) NOT NULL UNIQUE,
  bank_name    text        NOT NULL,
  total_rows   integer     NOT NULL DEFAULT 0,
  parsed_rows  integer     NOT NULL DEFAULT 0,
  error_rows   integer     NOT NULL DEFAULT 0,
  imported_by_id   uuid   REFERENCES fuel_users(id) ON DELETE SET NULL,
  imported_by_name text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fuel_bank_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_bank_imports_all_authenticated"
  ON fuel_bank_imports FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TABLE 12: fuel_bank_transactions
-- =============================================================================
CREATE TABLE fuel_bank_transactions (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id        uuid          NOT NULL REFERENCES fuel_bank_imports(id) ON DELETE CASCADE,
  transaction_date date          NOT NULL,
  credit_amount    numeric(15,2) NOT NULL DEFAULT 0,
  debit_amount     numeric(15,2) NOT NULL DEFAULT 0,
  reference        text,
  narration        text,
  payment_id       uuid          REFERENCES fuel_payments(id) ON DELETE SET NULL,
  created_at       timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_fuel_bank_transactions_import ON fuel_bank_transactions (import_id);

ALTER TABLE fuel_bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_bank_transactions_all_authenticated"
  ON fuel_bank_transactions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TABLE 13: fuel_sms_log
-- =============================================================================
CREATE TABLE fuel_sms_log (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       uuid        REFERENCES fuel_customers(id) ON DELETE SET NULL,
  phone             varchar(20) NOT NULL,
  message           text        NOT NULL,
  provider          text        NOT NULL CHECK (provider IN ('africas_talking','twilio')),
  status            text        NOT NULL CHECK (status IN ('sent','failed','skipped')),
  provider_response jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fuel_sms_log_customer ON fuel_sms_log (customer_id);

ALTER TABLE fuel_sms_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_sms_log_all_authenticated"
  ON fuel_sms_log FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TABLE 14: fuel_audit_log
-- =============================================================================
CREATE TABLE fuel_audit_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name   text        NOT NULL,
  record_id    uuid        NOT NULL,
  action       text        NOT NULL CHECK (action IN ('insert','update','delete')),
  old_values   jsonb,
  new_values   jsonb,
  changed_by_id   uuid    REFERENCES fuel_users(id) ON DELETE SET NULL,
  changed_by_name text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fuel_audit_log_table ON fuel_audit_log (table_name, record_id);

ALTER TABLE fuel_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_audit_log_all_authenticated"
  ON fuel_audit_log FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TABLE 15: fuel_settings
-- =============================================================================
CREATE TABLE fuel_settings (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  key        varchar(100) NOT NULL UNIQUE,
  value      text         NOT NULL,
  updated_by_id   uuid   REFERENCES fuel_users(id) ON DELETE SET NULL,
  updated_by_name text,
  updated_at timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE fuel_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_settings_all_authenticated"
  ON fuel_settings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =============================================================================
-- SEED: 4 fuel types + inventory records
-- =============================================================================
INSERT INTO fuel_fuel_types (id, name, current_price_per_litre, low_stock_threshold_litres)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'petrol',         180.00, 500),
  ('a1000000-0000-0000-0000-000000000002', 'diesel',         165.00, 500),
  ('a1000000-0000-0000-0000-000000000003', 'kerosene',       120.00, 500),
  ('a1000000-0000-0000-0000-000000000004', 'premium_diesel', 175.00, 500)
ON CONFLICT (name) DO NOTHING;

INSERT INTO fuel_inventory (fuel_type_id, stock_litres, updated_at)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 0, now()),
  ('a1000000-0000-0000-0000-000000000002', 0, now()),
  ('a1000000-0000-0000-0000-000000000003', 0, now()),
  ('a1000000-0000-0000-0000-000000000004', 0, now())
ON CONFLICT (fuel_type_id) DO NOTHING;

-- Default settings
INSERT INTO fuel_settings (key, value) VALUES
  ('sms_provider', 'africas_talking'),
  ('mpesa_environment', 'sandbox'),
  ('app_name', 'Alpha Fuel Manager')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- Done. All 15 fuel_ tables created with RLS enabled.
-- =============================================================================
