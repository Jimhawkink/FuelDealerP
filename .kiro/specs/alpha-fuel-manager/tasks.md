# Implementation Tasks: Alpha Fuel Manager

## 1. Project Setup & Infrastructure

- [x] 1.1 Initialise Next.js 14 App Router project with TypeScript in FuelDealerPaymentSystem/
- [x] 1.2 Install and configure Tailwind CSS, shadcn/ui component library
- [x] 1.3 Install dependencies: @supabase/supabase-js, @supabase/ssr, zod, recharts, lucide-react
- [x] 1.4 Install export dependencies: jspdf, jspdf-autotable, exceljs
- [x] 1.5 Install parsing dependencies: papaparse, xlsx (SheetJS)
- [x] 1.6 Install testing dependencies: fast-check, vitest, @testing-library/react
- [x] 1.7 Create Supabase project and configure environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- [x] 1.8 Configure Supabase client helpers for Next.js App Router (src/lib/supabase/client.ts, server.ts, middleware.ts)
- [x] 1.9 Set up Next.js middleware for session refresh and route protection
- [ ] 1.10 Configure Vercel deployment with environment variables

## 2. Database Schema Migration

- [x] 2.1 Create migration: fuel_users table with role enum and RLS policies
- [x] 2.2 Create migration: fuel_customers table with credit_limit, outstanding_balance, indexes, RLS
- [x] 2.3 Create migration: fuel_fuel_types and fuel_fuel_prices tables with RLS
- [x] 2.4 Create migration: fuel_shifts table with RLS (attendant can only manage own shifts)
- [x] 2.5 Create migration: fuel_sales table with GENERATED total_amount column, indexes, RLS
- [x] 2.6 Create migration: fuel_payments table with UNIQUE idempotency_key constraint, indexes, RLS
- [x] 2.7 Create migration: fuel_stk_push_requests table with UNIQUE checkout_request_id, RLS
- [x] 2.8 Create migration: fuel_inventory table with CHECK (stock_litres >= 0), RLS
- [x] 2.9 Create migration: fuel_inventory_log table with RLS
- [x] 2.10 Create migration: fuel_bank_imports table with UNIQUE sha256_hash, RLS
- [x] 2.11 Create migration: fuel_bank_transactions table with FK to fuel_payments, RLS
- [x] 2.12 Create migration: fuel_sms_log table with RLS
- [x] 2.13 Create migration: fuel_audit_log table with RLS
- [x] 2.14 Create migration: fuel_settings table with UNIQUE key constraint, RLS
- [x] 2.15 Seed initial data: 4 fuel types (petrol, diesel, kerosene, premium_diesel) with default prices and thresholds
- [x] 2.16 Seed initial fuel_inventory records (one per fuel type, starting stock = 0)

## 3. Authentication & Role Management

- [x] 3.1 Configure Supabase Auth to store role in app_metadata on user creation
- [x] 3.2 Create server action: createUser (dealer_admin only) that sets app_metadata.role via admin API
- [x] 3.3 Create server action: updateUser (dealer_admin only) for editing name, email, role
- [x] 3.4 Create server action: deactivateUser (dealer_admin only, cannot deactivate self)
- [x] 3.5 Create auth helper: getSessionUser() that returns user with role from app_metadata
- [x] 3.6 Create role guard middleware: requireRole(minRole) for API routes

## 4. Login Page (Cutting-Edge)

- [x] 4.1 Create app/(auth)/login/page.tsx with full-screen split layout
- [ ] 4.2 Build left brand panel: navy-to-amber animated gradient, Alpha Fuel Manager wordmark, animated fuel-drop SVG, tagline
- [ ] 4.3 Build right login form panel: glassmorphism card with backdrop-blur
- [ ] 4.4 Implement floating label Email and Password inputs with show/hide password toggle (Lucide Eye/EyeOff)
- [ ] 4.5 Implement submit button with amber gradient and Lucide Loader2 spin on loading state
- [ ] 4.6 Implement error state: red border + CSS shake animation on invalid credentials
- [x] 4.7 Wire up Supabase Auth signInWithPassword, redirect to /dashboard on success
- [x] 4.8 Create app/(auth)/reset-password/page.tsx for requesting password reset email
- [x] 4.9 Create app/(auth)/update-password/page.tsx for setting new password from reset link
- [ ] 4.10 Make login page fully responsive (brand panel collapses to top banner on mobile)

## 5. Dashboard Layout & Navigation

- [x] 5.1 Create app/(dashboard)/layout.tsx with collapsible sidebar and topbar
- [x] 5.2 Build role-aware sidebar navigation (dealer_admin sees all items; accountant hides Settings; attendant sees only Sales, Shifts, Dashboard)
- [x] 5.3 Display authenticated user name and role badge in topbar
- [x] 5.4 Implement logout button that calls supabase.auth.signOut() and redirects to /login
- [x] 5.5 Add low-stock warning banner component that appears when any fuel type is below threshold

## 6. Real-Time Dashboard

- [x] 6.1 Create app/(dashboard)/page.tsx with server component for initial KPI data fetch
- [x] 6.2 Build KPI cards: today's sales (litres), today's sales (KES), today's payments received, total outstanding balance, pending reconciliation count
- [x] 6.3 Implement Supabase Realtime subscription on fuel_sales INSERT to update sales KPI cards live
- [x] 6.4 Implement Supabase Realtime subscription on fuel_payments INSERT/UPDATE to update payments KPI and pending count live
- [x] 6.5 Build Recent Transactions feed (last 20 sales + payments, reverse chronological, with customer name, amount, channel, timestamp)
- [x] 6.6 Build Top Debtors list (top 10 customers by outstanding_balance, descending)
- [x] 6.7 Build Payment Channel Breakdown chart using Recharts (bar/pie chart of today's payments by channel)
- [x] 6.8 Apply role-based dashboard view (dealer_admin sees all; accountant sees KPIs + pending count; attendant sees own shift KPIs only)

## 7. Fuel Sales POS Module

- [ ] 7.1 Create app/(dashboard)/sales/page.tsx with new sale form
- [ ] 7.2 Build customer selector (searchable dropdown from fuel_customers WHERE is_active=true)
- [ ] 7.3 Build fuel type selector with current price auto-populated
- [ ] 7.4 Build quantity input with real-time total amount calculation (quantity x unit_price)
- [ ] 7.5 Implement sale type toggle: Pay Now vs Credit (Pay Later)
- [ ] 7.6 For Pay Now: show payment channel selector (Cash, M-Pesa STK Push, etc.)
- [ ] 7.7 Implement credit limit enforcement: show error if credit sale would exceed limit
- [ ] 7.8 Implement inventory check: show error if quantity exceeds available stock
- [ ] 7.9 Create POST /api/sales route that atomically inserts fuel_sales + updates fuel_inventory + inserts fuel_inventory_log
- [ ] 7.10 For credit sales: atomically update fuel_customers.outstanding_balance in same transaction
- [ ] 7.11 For Pay Now cash sales: atomically insert fuel_payments and reconcile to customer
- [ ] 7.12 For Pay Now M-Pesa STK: trigger STK Push and link to sale
- [ ] 7.13 Create app/(dashboard)/sales/history/page.tsx with filterable sales table (TanStack Table, server-side pagination)
- [ ] 7.14 Build shift management: open shift button, close shift button, active shift indicator in topbar
- [ ] 7.15 Create app/(dashboard)/shifts/page.tsx with shift list and summary per shift

## 8. Customer Account Management

- [ ] 8.1 Create app/(dashboard)/customers/page.tsx with searchable customer list (TanStack Table)
- [ ] 8.2 Show outstanding balance, credit limit, and credit utilisation % per customer in list
- [ ] 8.3 Create app/(dashboard)/customers/new/page.tsx with create customer form (dealer_admin only)
- [ ] 8.4 Create app/(dashboard)/customers/[id]/page.tsx with customer detail view
- [ ] 8.5 Build customer statement tab: chronological list of all sales and payments with running balance
- [ ] 8.6 Build debt aging tab: outstanding balance broken into 0-30, 31-60, 61-90, 90+ day buckets
- [ ] 8.7 Build edit customer form (dealer_admin only) including credit limit field
- [ ] 8.8 Implement credit limit change audit logging to fuel_audit_log
- [ ] 8.9 Implement deactivate customer action (dealer_admin only, soft delete)
- [ ] 8.10 Add SMS reminder button on customer detail page (triggers outstanding balance reminder SMS)

## 9. M-Pesa Integration

- [ ] 9.1 Create Supabase Edge Function: mpesa-c2b-callback (Daraja C2B webhook handler)
  - [ ] 9.1.1 Validate Daraja Authorization header
  - [ ] 9.1.2 Extract TransID, TransAmount, MSISDN, BillRefNumber
  - [ ] 9.1.3 Idempotency check on idempotency_key = "c2b:{TransID}"
  - [ ] 9.1.4 Insert fuel_payments with status=pending
  - [ ] 9.1.5 Call reconcile-payment Edge Function
  - [ ] 9.1.6 Return ResultCode:0 within 5 seconds
- [ ] 9.2 Create Supabase Edge Function: mpesa-stk-push
  - [ ] 9.2.1 Load Daraja credentials from Supabase Vault
  - [ ] 9.2.2 Get/refresh OAuth token with 55-min cache
  - [ ] 9.2.3 Build and POST STK Push request to Daraja
  - [ ] 9.2.4 Insert fuel_stk_push_requests record
  - [ ] 9.2.5 Return CheckoutRequestID to caller
- [ ] 9.3 Create Supabase Edge Function: mpesa-stk-callback
  - [ ] 9.3.1 Match CheckoutRequestID to fuel_stk_push_requests
  - [ ] 9.3.2 On success: insert fuel_payments, call reconcile-payment, update STK request status=success
  - [ ] 9.3.3 On failure: update STK request status=failed/cancelled
- [ ] 9.4 Create Next.js API route POST /api/payments/stk-push that calls mpesa-stk-push Edge Function
- [ ] 9.5 Create app/(dashboard)/payments/stk-push/page.tsx UI for initiating STK Push
- [ ] 9.6 Register Daraja C2B callback URLs via RegisterURL call (triggered from Settings > M-Pesa)

## 10. Auto-Reconciliation Engine

- [ ] 10.1 Create Supabase Edge Function: reconcile-payment
  - [ ] 10.1.1 Load payment record by payment_id
  - [ ] 10.1.2 Skip if already reconciled (idempotency guard)
  - [ ] 10.1.3 Step 1: phone number match (normalise to +254 prefix)
  - [ ] 10.1.4 Step 2: account reference match against raw_reference
  - [ ] 10.1.5 Step 3: customer name keyword match in raw_narration
  - [ ] 10.1.6 Single match: atomic postPayment (UPDATE fuel_payments + UPDATE fuel_customers.outstanding_balance)
  - [ ] 10.1.7 No match / ambiguous: leave status=pending
  - [ ] 10.1.8 On successful reconciliation: broadcast Supabase Realtime event + trigger send-sms
- [ ] 10.2 Create app/(dashboard)/payments/reconcile/page.tsx (Pending Reconciliation Queue)
  - [ ] 10.2.1 List all fuel_payments WHERE status=pending with amount, channel, reference, narration, received timestamp
  - [ ] 10.2.2 Supabase Realtime subscription to update queue live on new pending payments
  - [ ] 10.2.3 Manual assign: customer selector dropdown + confirm button
  - [ ] 10.2.4 POST /api/payments/reconcile route that calls reconcile-payment with manual customer_id override
- [ ] 10.3 Create app/(dashboard)/payments/page.tsx with all payments list (filterable by status, channel, date)

## 11. Bank Statement Import

- [ ] 11.1 Create Supabase Edge Function: import-bank-statement
  - [ ] 11.1.1 Compute SHA-256 hash, check for duplicate import
  - [ ] 11.1.2 Detect bank format by header fingerprinting (8 banks)
  - [ ] 11.1.3 Parse CSV with Papa Parse, parse Excel with SheetJS
  - [ ] 11.1.4 Map columns to BankTransaction objects per bank format
  - [ ] 11.1.5 Insert fuel_bank_imports and fuel_bank_transactions records
  - [ ] 11.1.6 For each credit row: insert fuel_payments + call reconcile-payment
  - [ ] 11.1.7 Return parse summary (total_rows, parsed_rows, error_rows, parse_errors)
- [ ] 11.2 Create app/(dashboard)/payments/import/page.tsx
  - [ ] 11.2.1 Drag-and-drop file upload zone (CSV and XLSX, max 10MB)
  - [ ] 11.2.2 Bank selector (auto-detected or manual override)
  - [ ] 11.2.3 Show parse summary after upload with error details
  - [ ] 11.2.4 Show list of imported transactions with reconciliation status
- [ ] 11.3 Implement Pretty_Printer: format BankTransaction[] to CSV with ISO dates and 2dp numbers
- [ ] 11.4 Add export parsed transactions as CSV button on import results page

## 12. Fuel Inventory Management

- [ ] 12.1 Create app/(dashboard)/inventory/page.tsx with stock level cards per fuel type
  - [ ] 12.1.1 Show current stock in litres, low-stock threshold, and visual progress bar
  - [ ] 12.1.2 Supabase Realtime subscription on fuel_inventory UPDATE for live stock updates
  - [ ] 12.1.3 Show low-stock warning badge when stock < threshold
- [ ] 12.2 Create app/(dashboard)/inventory/deliveries/page.tsx (dealer_admin only)
  - [ ] 12.2.1 Form: fuel type, quantity delivered, delivery date, supplier reference
  - [ ] 12.2.2 POST /api/inventory/delivery route: atomically UPDATE fuel_inventory + INSERT fuel_inventory_log
- [ ] 12.3 Create app/(dashboard)/inventory/log/page.tsx with filterable inventory history (by fuel type, date range)

## 13. Reports & Analytics

- [ ] 13.1 Create app/(dashboard)/reports/page.tsx as reports hub with links to all report types
- [ ] 13.2 Create app/(dashboard)/reports/sales/page.tsx
  - [ ] 13.2.1 Date range picker (daily/weekly/monthly presets)
  - [ ] 13.2.2 Table: litres sold and KES collected per fuel type per period
  - [ ] 13.2.3 Recharts bar chart of sales trend
  - [ ] 13.2.4 Export to PDF and Excel buttons
- [ ] 13.3 Create app/(dashboard)/reports/payments/page.tsx
  - [ ] 13.3.1 Payment collection by channel for selected date range
  - [ ] 13.3.2 Recharts pie/bar chart of channel breakdown
  - [ ] 13.3.3 Export to PDF and Excel
- [ ] 13.4 Create app/(dashboard)/reports/debt-aging/page.tsx
  - [ ] 13.4.1 All customers with outstanding balance > 0
  - [ ] 13.4.2 Columns: customer name, 0-30 days, 31-60 days, 61-90 days, 90+ days, total
  - [ ] 13.4.3 Export to PDF and Excel
- [ ] 13.5 Create app/(dashboard)/reports/inventory/page.tsx
  - [ ] 13.5.1 Opening stock, deliveries, sales, closing stock per fuel type for date range
  - [ ] 13.5.2 Export to PDF and Excel
- [ ] 13.6 Create app/(dashboard)/reports/shifts/page.tsx
  - [ ] 13.6.1 Shift summary per attendant: litres sold, KES collected, transaction count, channels used
  - [ ] 13.6.2 Export to PDF and Excel
- [ ] 13.7 Implement PDF export utility using jsPDF + jsPDF-AutoTable (shared across all reports)
- [ ] 13.8 Implement Excel export utility using ExcelJS (shared across all reports)

## 14. SMS Notifications

- [ ] 14.1 Create Supabase Edge Function: send-sms with SmsProvider adapter pattern
  - [ ] 14.1.1 Implement AfricasTalkingProvider class
  - [ ] 14.1.2 Implement TwilioProvider class
  - [ ] 14.1.3 Implement getSmsProvider() factory function reading from fuel_settings
  - [ ] 14.1.4 Load API credentials from Supabase Vault
  - [ ] 14.1.5 Validate phone number (E.164 format), skip and log if invalid
  - [ ] 14.1.6 Insert fuel_sms_log record with status=sent/failed/skipped
- [ ] 14.2 Trigger SMS on payment reconciliation (payment confirmation message)
- [ ] 14.3 Trigger SMS on credit sale (credit sale notification with new balance)
- [ ] 14.4 Trigger SMS when outstanding_balance exceeds 80% of credit_limit (credit limit warning)
- [ ] 14.5 Implement bulk SMS reminder: POST /api/sms/reminder for dealer_admin to send balance reminders to selected customers

## 15. Settings Module (dealer_admin only)

- [ ] 15.1 Create app/(dashboard)/settings/page.tsx as settings hub
- [ ] 15.2 Create app/(dashboard)/settings/mpesa/page.tsx
  - [ ] 15.2.1 Form: Consumer Key, Consumer Secret, Paybill/Till number, Passkey, callback URL
  - [ ] 15.2.2 Save credentials to Supabase Vault via POST /api/settings/mpesa
  - [ ] 15.2.3 Test connection button that calls Daraja OAuth endpoint
  - [ ] 15.2.4 Register C2B URLs button that calls Daraja RegisterURL
- [ ] 15.3 Create app/(dashboard)/settings/sms/page.tsx
  - [ ] 15.3.1 Provider selector: Africa's Talking or Twilio
  - [ ] 15.3.2 Conditional credential fields per provider
  - [ ] 15.3.3 Save to Supabase Vault + update fuel_settings.sms_provider
  - [ ] 15.3.4 Send test SMS button
- [ ] 15.4 Create app/(dashboard)/settings/fuel-prices/page.tsx
  - [ ] 15.4.1 Table of fuel types with editable current price per litre
  - [ ] 15.4.2 Save price change: UPDATE fuel_fuel_types + INSERT fuel_fuel_prices history + INSERT fuel_audit_log
- [ ] 15.5 Create app/(dashboard)/settings/users/page.tsx
  - [ ] 15.5.1 User list with name, email, role, active status
  - [ ] 15.5.2 Create user form (name, email, role)
  - [ ] 15.5.3 Edit user form
  - [ ] 15.5.4 Deactivate user button (with self-deactivation guard)
- [ ] 15.6 Create app/(dashboard)/settings/thresholds/page.tsx
  - [ ] 15.6.1 Editable low-stock threshold per fuel type
  - [ ] 15.6.2 Save to fuel_fuel_types.low_stock_threshold_litres

## 16. Property-Based Tests

- [ ] 16.1 Set up fast-check and vitest test configuration
- [ ] 16.2 Write PBT: Balance Integrity property
  - [ ] 16.2.1 Generator: arbitrary sequence of credit sales and payments
  - [ ] 16.2.2 Property: outstanding_balance === sum(sales) - sum(payments) after all transactions
- [ ] 16.3 Write PBT: Idempotency property
  - [ ] 16.3.1 Generator: arbitrary payment + duplicate count 1-10
  - [ ] 16.3.2 Property: posting same idempotency_key N times results in exactly 1 payment record
- [ ] 16.4 Write PBT: Bank Statement Round-Trip property
  - [ ] 16.4.1 Generator: arbitrary list of BankTransaction objects
  - [ ] 16.4.2 Property: parse(prettyPrint(transactions)) deep-equals transactions
- [ ] 16.5 Write unit tests for reconcile-payment matching logic (phone, reference, name keyword)
- [ ] 16.6 Write unit tests for bank format detection (header fingerprinting for all 8 banks)

## 17. Security Hardening

- [ ] 17.1 Add Zod validation schemas for all API route inputs
- [ ] 17.2 Verify all RLS policies are active and correct on all fuel_ tables
- [ ] 17.3 Add Daraja IP whitelist check in mpesa-c2b-callback Edge Function
- [ ] 17.4 Ensure all Supabase Vault secrets are referenced by name (never hardcoded)
- [ ] 17.5 Add rate limiting on auth endpoints (Supabase built-in + custom middleware)
- [ ] 17.6 Verify attendant cannot access reports, settings, or reconciliation via direct URL
- [ ] 17.7 Verify accountant cannot modify credit limits via direct API call

## 18. Deployment & Final Configuration

- [ ] 18.1 Configure Vercel project with all required environment variables
- [ ] 18.2 Set up Supabase Edge Function environment variables (MPESA_ENV, Vault secret names)
- [ ] 18.3 Run all database migrations on production Supabase project
- [ ] 18.4 Register Daraja C2B callback URLs for production environment
- [ ] 18.5 Seed production fuel types and initial inventory records
- [ ] 18.6 Create initial dealer_admin user account
- [ ] 18.7 Run PBT test suite and verify all properties pass
- [ ] 18.8 Perform end-to-end test: record sale, receive M-Pesa payment, verify auto-reconciliation, check dashboard updates in real time
