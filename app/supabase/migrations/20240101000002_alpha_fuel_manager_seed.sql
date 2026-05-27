-- =============================================================================
-- Alpha Fuel Manager - Seed Data Migration
-- Migration: 20240101000002_alpha_fuel_manager_seed.sql
-- Seeds the 4 fuel types and their corresponding inventory records.
-- =============================================================================

-- Use fixed UUIDs so the seed is idempotent (safe to re-run with ON CONFLICT DO NOTHING)
DO $$
DECLARE
  v_petrol_id         uuid := 'a1000000-0000-0000-0000-000000000001';
  v_diesel_id         uuid := 'a1000000-0000-0000-0000-000000000002';
  v_kerosene_id       uuid := 'a1000000-0000-0000-0000-000000000003';
  v_premium_diesel_id uuid := 'a1000000-0000-0000-0000-000000000004';
BEGIN

  -- ------------------------------------------------------------------
  -- 2.15 Seed fuel_fuel_types
  -- ------------------------------------------------------------------
  INSERT INTO fuel_fuel_types (id, name, current_price_per_litre, low_stock_threshold_litres)
  VALUES
    (v_petrol_id,         'petrol',         180.00, 500),
    (v_diesel_id,         'diesel',         165.00, 500),
    (v_kerosene_id,       'kerosene',       120.00, 500),
    (v_premium_diesel_id, 'premium_diesel', 175.00, 500)
  ON CONFLICT (name) DO NOTHING;

  -- ------------------------------------------------------------------
  -- 2.16 Seed fuel_inventory (one row per fuel type, starting stock = 0)
  -- ------------------------------------------------------------------
  INSERT INTO fuel_inventory (fuel_type_id, stock_litres, updated_at)
  VALUES
    (v_petrol_id,         0, now()),
    (v_diesel_id,         0, now()),
    (v_kerosene_id,       0, now()),
    (v_premium_diesel_id, 0, now())
  ON CONFLICT (fuel_type_id) DO NOTHING;

END $$;
