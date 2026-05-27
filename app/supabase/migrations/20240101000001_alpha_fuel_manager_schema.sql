-- =============================================================================
-- Alpha Fuel Manager - Complete Database Schema Migration
-- Migration: 20240101000001_alpha_fuel_manager_schema.sql
-- All tables use the fuel_ prefix. RLS is enabled on every table.
-- Role is read from JWT: (auth.jwt() -> 'app_metadata' ->> 'role')
-- =============================================================================

-- =============================================================================
-- 2.1 fuel_users
-- =============================================================================
CREATE TABLE IF NOT EXISTS fuel_users (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text        NOT NULL,
  email       text        NOT NULL UNIQUE,
  role        text        NOT NULL CHECK (role IN ('dealer_admin', 'accountant', 'attendant')),
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fuel_users ENABLE ROW LEVEL SECURITY;

-- dealer_admin: full access
CREATE POLICY "fuel_users_dealer_admin_all"
  ON fuel_users
  FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin');

-- any authenticated user can SELECT their own row
CREATE POLICY "fuel_users_self_select"
  ON fuel_users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- accountant: SELECT all
CREATE POLICY "fuel_users_accountant_select"
  ON fuel_users
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

-- attendant: SELECT all (needed to look up attendant names)
CREATE POLICY "fuel_users_attendant_select"
  ON fuel_users
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'attendant');

-- =============================================================================
-- 2.2 fuel_customers
-- =============================================================================
CREATE TABLE IF NOT EXISTS fuel_customers (
  id                  uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           text           NOT NULL,
  phone               varchar(20)    NOT NULL UNIQUE,
  email               text,
  company_name        text,
  credit_limit        numeric(15,2)  NOT NULL DEFAULT 0,
  outstanding_balance numeric(15,2)  NOT NULL DEFAULT 0,
  is_active           boolean        NOT NULL DEFAULT true,
  created_at          timestamptz    NOT NULL DEFAULT now(),
  updated_at          timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_customers_phone ON fuel_customers (phone);

ALTER TABLE fuel_customers ENABLE ROW LEVEL SECURITY;

-- dealer_admin: full access
CREATE POLICY "fuel_customers_dealer_admin_all"
  ON fuel_customers
  FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin');

-- accountant: SELECT only (no credit_limit UPDATE — enforced by not granting UPDATE policy)
CREATE POLICY "fuel_customers_accountant_select"
  ON fuel_customers
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

-- attendant: SELECT only
CREATE POLICY "fuel_customers_attendant_select"
  ON fuel_customers
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'attendant');

-- =============================================================================
-- 2.3 fuel_fuel_types
-- =============================================================================
CREATE TABLE IF NOT EXISTS fuel_fuel_types (
  id                        uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      text           NOT NULL UNIQUE CHECK (name IN ('petrol', 'diesel', 'kerosene', 'premium_diesel')),
  current_price_per_litre   numeric(10,2)  NOT NULL,
  low_stock_threshold_litres numeric(10,2) NOT NULL DEFAULT 500,
  created_at                timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE fuel_fuel_types ENABLE ROW LEVEL SECURITY;

-- dealer_admin: full access
CREATE POLICY "fuel_fuel_types_dealer_admin_all"
  ON fuel_fuel_types
  FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin');

-- accountant: SELECT
CREATE POLICY "fuel_fuel_types_accountant_select"
  ON fuel_fuel_types
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

-- attendant: SELECT
CREATE POLICY "fuel_fuel_types_attendant_select"
  ON fuel_fuel_types
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'attendant');

-- =============================================================================
-- 2.4 fuel_fuel_prices (price history)
-- =============================================================================
CREATE TABLE IF NOT EXISTS fuel_fuel_prices (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_type_id     uuid           NOT NULL REFERENCES fuel_fuel_types(id) ON DELETE CASCADE,
  price_per_litre  numeric(10,2)  NOT NULL,
  effective_from   timestamptz    NOT NULL DEFAULT now(),
  changed_by       uuid           REFERENCES fuel_users(id) ON DELETE SET NULL,
  created_at       timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE fuel_fuel_prices ENABLE ROW LEVEL SECURITY;

-- dealer_admin: full access
CREATE POLICY "fuel_fuel_prices_dealer_admin_all"
  ON fuel_fuel_prices
  FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin');

-- accountant: SELECT
CREATE POLICY "fuel_fuel_prices_accountant_select"
  ON fuel_fuel_prices
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

-- attendant: SELECT
CREATE POLICY "fuel_fuel_prices_attendant_select"
  ON fuel_fuel_prices
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'attendant');

-- =============================================================================
-- 2.5 fuel_shifts
-- =============================================================================
CREATE TABLE IF NOT EXISTS fuel_shifts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  attendant_id  uuid        NOT NULL REFERENCES fuel_users(id) ON DELETE RESTRICT,
  started_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  status        text        NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'open'
);

ALTER TABLE fuel_shifts ENABLE ROW LEVEL SECURITY;

-- dealer_admin: full access
CREATE POLICY "fuel_shifts_dealer_admin_all"
  ON fuel_shifts
  FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin');

-- accountant: SELECT all
CREATE POLICY "fuel_shifts_accountant_select"
  ON fuel_shifts
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

-- attendant: SELECT all shifts (to see shift history), INSERT/UPDATE own shifts only
CREATE POLICY "fuel_shifts_attendant_select"
  ON fuel_shifts
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'attendant');

CREATE POLICY "fuel_shifts_attendant_insert"
  ON fuel_shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'attendant'
    AND attendant_id = auth.uid()
  );

CREATE POLICY "fuel_shifts_attendant_update"
  ON fuel_shifts
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'attendant'
    AND attendant_id = auth.uid()
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'attendant'
    AND attendant_id = auth.uid()
  );

-- =============================================================================
-- 2.6 fuel_sales
-- =============================================================================
CREATE TABLE IF NOT EXISTS fuel_sales (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      uuid           NOT NULL REFERENCES fuel_customers(id) ON DELETE RESTRICT,
  fuel_type_id     uuid           NOT NULL REFERENCES fuel_fuel_types(id) ON DELETE RESTRICT,
  quantity_litres  numeric(10,3)  NOT NULL CHECK (quantity_litres > 0),
  unit_price       numeric(10,2)  NOT NULL,
  total_amount     numeric(15,2)  GENERATED ALWAYS AS (quantity_litres * unit_price) STORED,
  sale_type        text           NOT NULL CHECK (sale_type IN ('pay_now', 'credit')),
  payment_channel  text           CHECK (payment_channel IN ('mpesa_paybill', 'mpesa_till', 'mpesa_stk', 'pesalink', 'eft_rtgs', 'bank_deposit', 'cash')),
  shift_id         uuid           REFERENCES fuel_shifts(id) ON DELETE SET NULL,
  attendant_id     uuid           NOT NULL REFERENCES fuel_users(id) ON DELETE RESTRICT,
  created_at       timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fuel_sales_customer_id ON fuel_sales (customer_id);
CREATE INDEX IF NOT EXISTS idx_fuel_sales_created_at  ON fuel_sales (created_at);
CREATE INDEX IF NOT EXISTS idx_fuel_sales_shift_id    ON fuel_sales (shift_id);

ALTER TABLE fuel_sales ENABLE ROW LEVEL SECURITY;

-- dealer_admin: full access
CREATE POLICY "fuel_sales_dealer_admin_all"
  ON fuel_sales
  FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin');

-- accountant: SELECT all
CREATE POLICY "fuel_sales_accountant_select"
  ON fuel_sales
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

-- attendant: SELECT all sales, INSERT own sales only
CREATE POLICY "fuel_sales_attendant_select"
  ON fuel_sales
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'attendant');

CREATE POLICY "fuel_sales_attendant_insert"
  ON fuel_sales
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'attendant'
    AND attendant_id = auth.uid()
  );

-- =============================================================================
-- 2.7 fuel_payments
-- =============================================================================
CREATE TABLE IF NOT EXISTS fuel_payments (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      uuid           REFERENCES fuel_customers(id) ON DELETE SET NULL,
  amount           numeric(15,2)  NOT NULL CHECK (amount > 0),
  channel          text           NOT NULL CHECK (channel IN ('mpesa_paybill', 'mpesa_till', 'mpesa_stk', 'pesalink', 'eft_rtgs', 'bank_deposit', 'cash')),
  idempotency_key  varchar(255)   NOT NULL UNIQUE,
  status           text           NOT NULL CHECK (status IN ('reconciled', 'pending')) DEFAULT 'pending',
  reconciled_by    uuid           REFERENCES fuel_users(id) ON DELETE SET NULL,
  reconciled_at    timestamptz,
  raw_reference    text,
  raw_narration    text,
  raw_phone        varchar(20),
  created_at       timestamptz    NOT NULL DEFAULT now()
);

-- idempotency_key already has a UNIQUE constraint above (creates implicit unique index)
CREATE INDEX IF NOT EXISTS idx_fuel_payments_status      ON fuel_payments (status);
CREATE INDEX IF NOT EXISTS idx_fuel_payments_customer_id ON fuel_payments (customer_id);

ALTER TABLE fuel_payments ENABLE ROW LEVEL SECURITY;

-- dealer_admin: full access
CREATE POLICY "fuel_payments_dealer_admin_all"
  ON fuel_payments
  FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin');

-- accountant: SELECT all + INSERT + UPDATE (reconciliation)
CREATE POLICY "fuel_payments_accountant_select"
  ON fuel_payments
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

CREATE POLICY "fuel_payments_accountant_insert"
  ON fuel_payments
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

CREATE POLICY "fuel_payments_accountant_update"
  ON fuel_payments
  FOR UPDATE
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

-- attendant: no access to fuel_payments

-- =============================================================================
-- 2.8 fuel_stk_push_requests
-- =============================================================================
CREATE TABLE IF NOT EXISTS fuel_stk_push_requests (
  id                   uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id          uuid           NOT NULL REFERENCES fuel_customers(id) ON DELETE RESTRICT,
  amount               numeric(15,2)  NOT NULL,
  phone                varchar(20)    NOT NULL,
  checkout_request_id  varchar(100)   UNIQUE,
  merchant_request_id  varchar(100),
  status               text           NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'cancelled')) DEFAULT 'pending',
  initiated_by         uuid           NOT NULL REFERENCES fuel_users(id) ON DELETE RESTRICT,
  created_at           timestamptz    NOT NULL DEFAULT now(),
  updated_at           timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE fuel_stk_push_requests ENABLE ROW LEVEL SECURITY;

-- dealer_admin: full access
CREATE POLICY "fuel_stk_push_requests_dealer_admin_all"
  ON fuel_stk_push_requests
  FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin');

-- accountant: SELECT all + INSERT (initiate STK push) + UPDATE (status updates)
CREATE POLICY "fuel_stk_push_requests_accountant_select"
  ON fuel_stk_push_requests
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

CREATE POLICY "fuel_stk_push_requests_accountant_insert"
  ON fuel_stk_push_requests
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

CREATE POLICY "fuel_stk_push_requests_accountant_update"
  ON fuel_stk_push_requests
  FOR UPDATE
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

-- =============================================================================
-- 2.9 fuel_inventory
-- =============================================================================
CREATE TABLE IF NOT EXISTS fuel_inventory (
  id            uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_type_id  uuid           NOT NULL UNIQUE REFERENCES fuel_fuel_types(id) ON DELETE RESTRICT,
  stock_litres  numeric(12,3)  NOT NULL DEFAULT 0 CHECK (stock_litres >= 0),
  updated_at    timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE fuel_inventory ENABLE ROW LEVEL SECURITY;

-- dealer_admin: full access
CREATE POLICY "fuel_inventory_dealer_admin_all"
  ON fuel_inventory
  FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin');

-- accountant: SELECT
CREATE POLICY "fuel_inventory_accountant_select"
  ON fuel_inventory
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

-- attendant: SELECT
CREATE POLICY "fuel_inventory_attendant_select"
  ON fuel_inventory
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'attendant');

-- =============================================================================
-- 2.10 fuel_inventory_log
-- =============================================================================
CREATE TABLE IF NOT EXISTS fuel_inventory_log (
  id                uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_type_id      uuid           NOT NULL REFERENCES fuel_fuel_types(id) ON DELETE RESTRICT,
  quantity_change   numeric(12,3)  NOT NULL,
  resulting_balance numeric(12,3)  NOT NULL,
  event_type        text           NOT NULL CHECK (event_type IN ('sale', 'delivery', 'adjustment')),
  reference_id      uuid,
  changed_by        uuid           REFERENCES fuel_users(id) ON DELETE SET NULL,
  created_at        timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE fuel_inventory_log ENABLE ROW LEVEL SECURITY;

-- dealer_admin: full access
CREATE POLICY "fuel_inventory_log_dealer_admin_all"
  ON fuel_inventory_log
  FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin');

-- accountant: SELECT
CREATE POLICY "fuel_inventory_log_accountant_select"
  ON fuel_inventory_log
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

-- attendant: no access to inventory log

-- =============================================================================
-- 2.11 fuel_bank_imports
-- =============================================================================
CREATE TABLE IF NOT EXISTS fuel_bank_imports (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  filename     text        NOT NULL,
  sha256_hash  varchar(64) NOT NULL UNIQUE,
  bank_name    text        NOT NULL,
  total_rows   integer     NOT NULL DEFAULT 0,
  parsed_rows  integer     NOT NULL DEFAULT 0,
  error_rows   integer     NOT NULL DEFAULT 0,
  imported_by  uuid        NOT NULL REFERENCES fuel_users(id) ON DELETE RESTRICT,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fuel_bank_imports ENABLE ROW LEVEL SECURITY;

-- dealer_admin: full access
CREATE POLICY "fuel_bank_imports_dealer_admin_all"
  ON fuel_bank_imports
  FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin');

-- accountant: SELECT + INSERT (import bank statements)
CREATE POLICY "fuel_bank_imports_accountant_select"
  ON fuel_bank_imports
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

CREATE POLICY "fuel_bank_imports_accountant_insert"
  ON fuel_bank_imports
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

-- =============================================================================
-- 2.12 fuel_bank_transactions
-- =============================================================================
CREATE TABLE IF NOT EXISTS fuel_bank_transactions (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id        uuid           NOT NULL REFERENCES fuel_bank_imports(id) ON DELETE CASCADE,
  transaction_date date           NOT NULL,
  credit_amount    numeric(15,2)  NOT NULL DEFAULT 0,
  debit_amount     numeric(15,2)  NOT NULL DEFAULT 0,
  reference        text,
  narration        text,
  payment_id       uuid           REFERENCES fuel_payments(id) ON DELETE SET NULL,
  created_at       timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE fuel_bank_transactions ENABLE ROW LEVEL SECURITY;

-- dealer_admin: full access
CREATE POLICY "fuel_bank_transactions_dealer_admin_all"
  ON fuel_bank_transactions
  FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin');

-- accountant: SELECT + INSERT
CREATE POLICY "fuel_bank_transactions_accountant_select"
  ON fuel_bank_transactions
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

CREATE POLICY "fuel_bank_transactions_accountant_insert"
  ON fuel_bank_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

-- =============================================================================
-- 2.13 fuel_sms_log
-- =============================================================================
CREATE TABLE IF NOT EXISTS fuel_sms_log (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       uuid        REFERENCES fuel_customers(id) ON DELETE SET NULL,
  phone             varchar(20) NOT NULL,
  message           text        NOT NULL,
  provider          text        NOT NULL CHECK (provider IN ('africas_talking', 'twilio')),
  status            text        NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  provider_response jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fuel_sms_log ENABLE ROW LEVEL SECURITY;

-- dealer_admin: full access
CREATE POLICY "fuel_sms_log_dealer_admin_all"
  ON fuel_sms_log
  FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin');

-- accountant: SELECT all + INSERT (send SMS)
CREATE POLICY "fuel_sms_log_accountant_select"
  ON fuel_sms_log
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

CREATE POLICY "fuel_sms_log_accountant_insert"
  ON fuel_sms_log
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

-- attendant: no access to sms_log

-- =============================================================================
-- 2.14 fuel_audit_log
-- =============================================================================
CREATE TABLE IF NOT EXISTS fuel_audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  text        NOT NULL,
  record_id   uuid        NOT NULL,
  action      text        NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  old_values  jsonb,
  new_values  jsonb,
  changed_by  uuid        NOT NULL REFERENCES fuel_users(id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fuel_audit_log ENABLE ROW LEVEL SECURITY;

-- dealer_admin: full access
CREATE POLICY "fuel_audit_log_dealer_admin_all"
  ON fuel_audit_log
  FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin');

-- accountant: SELECT only
CREATE POLICY "fuel_audit_log_accountant_select"
  ON fuel_audit_log
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'accountant');

-- attendant: no access to audit_log

-- =============================================================================
-- 2.15 fuel_settings
-- =============================================================================
CREATE TABLE IF NOT EXISTS fuel_settings (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  key         varchar(100) NOT NULL UNIQUE,
  value       text         NOT NULL,
  updated_by  uuid         REFERENCES fuel_users(id) ON DELETE SET NULL,
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE fuel_settings ENABLE ROW LEVEL SECURITY;

-- dealer_admin: full access ONLY (accountant and attendant have NO access)
CREATE POLICY "fuel_settings_dealer_admin_all"
  ON fuel_settings
  FOR ALL
  TO authenticated
  USING  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'dealer_admin');

-- =============================================================================
-- End of schema migration
-- =============================================================================
