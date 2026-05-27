# Alpha Fuel Manager — Supabase Migrations

This directory contains all database migrations for the Alpha Fuel Manager system.

## Migration Files

| File | Description |
|------|-------------|
| `migrations/20240101000001_alpha_fuel_manager_schema.sql` | Creates all 15 `fuel_*` tables with constraints, indexes, and RLS policies |
| `migrations/20240101000002_alpha_fuel_manager_seed.sql` | Seeds the 4 fuel types and their initial inventory records |

---

## Running Migrations

### Option 1 — Supabase CLI (recommended)

The Supabase CLI applies migrations in filename order and tracks which have already run.

**Prerequisites:** [Install the Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)

```bash
# 1. Log in
supabase login

# 2. Link to your Supabase project (run from the repo root or the app/ directory)
supabase link --project-ref <YOUR_PROJECT_REF>

# 3. Push all pending migrations to the remote database
supabase db push
```

To run migrations against a local Supabase instance (Docker):

```bash
# Start local Supabase stack
supabase start

# Apply migrations locally
supabase db reset        # resets and re-applies all migrations from scratch
# — or —
supabase migration up    # applies only new/pending migrations
```

---

### Option 2 — Supabase SQL Editor (manual)

1. Open your project in the [Supabase Dashboard](https://app.supabase.com).
2. Navigate to **SQL Editor** in the left sidebar.
3. Click **New query**.
4. Copy and paste the contents of `20240101000001_alpha_fuel_manager_schema.sql` into the editor.
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).
6. Repeat steps 3–5 for `20240101000002_alpha_fuel_manager_seed.sql`.

> **Order matters.** Always run the schema migration before the seed migration.

---

## Environment Variables

After running migrations, make sure the following environment variables are set in your Next.js app (`.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

These values are available in your Supabase project under **Settings → API**.

---

## RLS Role Model

Row-Level Security is enabled on every table. The user's role is read from the JWT:

```sql
auth.jwt() -> 'app_metadata' ->> 'role'
```

| Role | Permissions |
|------|-------------|
| `dealer_admin` | Full SELECT / INSERT / UPDATE / DELETE on all `fuel_*` tables |
| `accountant` | SELECT all tables · INSERT + UPDATE `fuel_payments` · INSERT `fuel_sms_log` · No `fuel_settings` access · No `credit_limit` UPDATE |
| `attendant` | SELECT `fuel_customers`, `fuel_fuel_types`, `fuel_inventory` · INSERT `fuel_sales` (own only) · INSERT + UPDATE `fuel_shifts` (own only) |

Roles are assigned by a `dealer_admin` via the Supabase Auth admin API and stored in `auth.users.app_metadata.role`.

---

## Re-running / Resetting

If you need to tear down and recreate the schema during development:

```bash
# Full reset (drops all tables and re-applies every migration)
supabase db reset
```

> **Warning:** `db reset` is destructive. Never run it against a production database.
