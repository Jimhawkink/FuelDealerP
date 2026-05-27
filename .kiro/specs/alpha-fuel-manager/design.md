# Design Document: Alpha Fuel Manager

## 1. System Architecture

### 1.1 Tech Stack

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend**: Supabase PostgreSQL 15, Edge Functions (Deno), Realtime, Storage, Vault
- **Auth**: Supabase Auth with JWT; role stored in app_metadata.role
- **M-Pesa**: Safaricom Daraja API v2 (C2B, STK Push, OAuth)
- **SMS**: Africa's Talking + Twilio (provider-agnostic adapter pattern)
- **Parsing**: Papa Parse (CSV), SheetJS (Excel)
- **Export**: jsPDF + jsPDF-AutoTable (PDF), ExcelJS (Excel)
- **PBT**: fast-check for property-based testing
- **DB prefix**: All tables use fuel_ prefix

### 1.2 High-Level Architecture

```
Browser -> Next.js 14 (Vercel) -> Supabase Auth
Next.js -> Supabase Edge Functions -> PostgreSQL 15
Edge Functions -> Daraja API (M-Pesa C2B + STK Push callbacks)
Edge Functions -> SMS Provider (Africa's Talking / Twilio)
Edge Functions -> Supabase Vault (secrets)
PostgreSQL -> Supabase Realtime -> Browser (live dashboard)
```

### 1.3 Deployment

- Next.js deployed on Vercel Edge Network
- Supabase cloud project for all backend services
- Daraja webhook URLs registered via C2B RegisterURL call
- Supabase Storage bucket: bank-statements (private, authenticated access only)

## 2. Database Schema

All tables use the fuel_ prefix. RLS is enabled on every table.

### 2.1 fuel_users

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, references auth.users(id) |
| full_name | text | NOT NULL |
| email | text | NOT NULL UNIQUE |
| role | text | NOT NULL CHECK IN (dealer_admin, accountant, attendant) |
| is_active | boolean | NOT NULL DEFAULT true |
| created_at | timestamptz | NOT NULL DEFAULT now() |

RLS: dealer_admin can SELECT/INSERT/UPDATE all rows. Users can SELECT their own row.

### 2.2 fuel_customers

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK DEFAULT gen_random_uuid() |
| full_name | text | NOT NULL |
| phone | varchar(20) | NOT NULL UNIQUE |
| email | text | nullable |
| company_name | text | nullable |
| credit_limit | numeric(15,2) | NOT NULL DEFAULT 0 |
| outstanding_balance | numeric(15,2) | NOT NULL DEFAULT 0 |
| is_active | boolean | NOT NULL DEFAULT true |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

Indexes: idx_fuel_customers_phone ON phone
RLS: dealer_admin full access. accountant/attendant SELECT only.
Credit limit UPDATE restricted to dealer_admin via RLS policy.

### 2.3 fuel_fuel_types

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| name | text | NOT NULL UNIQUE CHECK IN (petrol,diesel,kerosene,premium_diesel) |
| current_price_per_litre | numeric(10,2) | NOT NULL |
| low_stock_threshold_litres | numeric(10,2) | NOT NULL DEFAULT 500 |
| created_at | timestamptz | NOT NULL DEFAULT now() |

### 2.4 fuel_fuel_prices (price history)

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| fuel_type_id | uuid | FK fuel_fuel_types(id) |
| price_per_litre | numeric(10,2) | NOT NULL |
| effective_from | timestamptz | NOT NULL DEFAULT now() |
| changed_by | uuid | FK fuel_users(id) |
| created_at | timestamptz | NOT NULL DEFAULT now() |

### 2.5 fuel_shifts

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| attendant_id | uuid | FK fuel_users(id) NOT NULL |
| started_at | timestamptz | NOT NULL DEFAULT now() |
| ended_at | timestamptz | nullable |
| status | text | NOT NULL CHECK IN (open, closed) DEFAULT open |

### 2.6 fuel_sales

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| customer_id | uuid | FK fuel_customers(id) NOT NULL |
| fuel_type_id | uuid | FK fuel_fuel_types(id) NOT NULL |
| quantity_litres | numeric(10,3) | NOT NULL CHECK > 0 |
| unit_price | numeric(10,2) | NOT NULL |
| total_amount | numeric(15,2) | GENERATED ALWAYS AS (quantity_litres * unit_price) STORED |
| sale_type | text | NOT NULL CHECK IN (pay_now, credit) |
| payment_channel | text | CHECK IN (mpesa_paybill,mpesa_till,mpesa_stk,pesalink,eft_rtgs,bank_deposit,cash) |
| shift_id | uuid | FK fuel_shifts(id) |
| attendant_id | uuid | FK fuel_users(id) NOT NULL |
| created_at | timestamptz | NOT NULL DEFAULT now() |

Indexes: idx_fuel_sales_customer_id, idx_fuel_sales_created_at, idx_fuel_sales_shift_id

### 2.7 fuel_payments

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| customer_id | uuid | FK fuel_customers(id) NULLABLE |
| amount | numeric(15,2) | NOT NULL CHECK > 0 |
| channel | text | NOT NULL CHECK IN (mpesa_paybill,mpesa_till,mpesa_stk,pesalink,eft_rtgs,bank_deposit,cash) |
| idempotency_key | varchar(255) | NOT NULL UNIQUE |
| status | text | NOT NULL CHECK IN (reconciled, pending) DEFAULT pending |
| reconciled_by | uuid | FK fuel_users(id) NULLABLE |
| reconciled_at | timestamptz | nullable |
| raw_reference | text | nullable |
| raw_narration | text | nullable |
| raw_phone | varchar(20) | nullable |
| created_at | timestamptz | NOT NULL DEFAULT now() |

CRITICAL: UNIQUE constraint on idempotency_key enforces duplicate-payment prevention at DB level.
Indexes: idx_fuel_payments_idempotency_key (UNIQUE), idx_fuel_payments_status, idx_fuel_payments_customer_id

### 2.8 fuel_stk_push_requests

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| customer_id | uuid | FK fuel_customers(id) NOT NULL |
| amount | numeric(15,2) | NOT NULL |
| phone | varchar(20) | NOT NULL |
| checkout_request_id | varchar(100) | UNIQUE |
| merchant_request_id | varchar(100) | nullable |
| status | text | NOT NULL CHECK IN (pending,success,failed,cancelled) DEFAULT pending |
| initiated_by | uuid | FK fuel_users(id) NOT NULL |
| created_at | timestamptz | NOT NULL DEFAULT now() |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

### 2.9 fuel_inventory

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| fuel_type_id | uuid | FK fuel_fuel_types(id) NOT NULL UNIQUE |
| stock_litres | numeric(12,3) | NOT NULL DEFAULT 0 CHECK >= 0 |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

CRITICAL: CHECK (stock_litres >= 0) enforces the inventory-never-negative invariant at DB level.

### 2.10 fuel_inventory_log

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| fuel_type_id | uuid | FK fuel_fuel_types(id) NOT NULL |
| quantity_change | numeric(12,3) | NOT NULL |
| resulting_balance | numeric(12,3) | NOT NULL |
| event_type | text | NOT NULL CHECK IN (sale, delivery, adjustment) |
| reference_id | uuid | nullable |
| changed_by | uuid | FK fuel_users(id) nullable |
| created_at | timestamptz | NOT NULL DEFAULT now() |

### 2.11 fuel_bank_imports

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| filename | text | NOT NULL |
| sha256_hash | varchar(64) | NOT NULL UNIQUE |
| bank_name | text | NOT NULL |
| total_rows | integer | NOT NULL DEFAULT 0 |
| parsed_rows | integer | NOT NULL DEFAULT 0 |
| error_rows | integer | NOT NULL DEFAULT 0 |
| imported_by | uuid | FK fuel_users(id) NOT NULL |
| created_at | timestamptz | NOT NULL DEFAULT now() |

UNIQUE on sha256_hash prevents duplicate file imports.

### 2.12 fuel_bank_transactions

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| import_id | uuid | FK fuel_bank_imports(id) NOT NULL |
| transaction_date | date | NOT NULL |
| credit_amount | numeric(15,2) | NOT NULL DEFAULT 0 |
| debit_amount | numeric(15,2) | NOT NULL DEFAULT 0 |
| reference | text | nullable |
| narration | text | nullable |
| payment_id | uuid | FK fuel_payments(id) NULLABLE |
| created_at | timestamptz | NOT NULL DEFAULT now() |

### 2.13 fuel_sms_log

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| customer_id | uuid | FK fuel_customers(id) NULLABLE |
| phone | varchar(20) | NOT NULL |
| message | text | NOT NULL |
| provider | text | NOT NULL CHECK IN (africas_talking, twilio) |
| status | text | NOT NULL CHECK IN (sent, failed, skipped) |
| provider_response | jsonb | nullable |
| created_at | timestamptz | NOT NULL DEFAULT now() |

### 2.14 fuel_audit_log

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| table_name | text | NOT NULL |
| record_id | uuid | NOT NULL |
| action | text | NOT NULL CHECK IN (insert, update, delete) |
| old_values | jsonb | nullable |
| new_values | jsonb | nullable |
| changed_by | uuid | FK fuel_users(id) NOT NULL |
| created_at | timestamptz | NOT NULL DEFAULT now() |

### 2.15 fuel_settings

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| key | varchar(100) | NOT NULL UNIQUE |
| value | text | NOT NULL |
| updated_by | uuid | FK fuel_users(id) nullable |
| updated_at | timestamptz | NOT NULL DEFAULT now() |

## 3. RLS Policy Design

Role is read from JWT: `(auth.jwt() -> 'app_metadata' ->> 'role')`

### dealer_admin policies
- Full SELECT, INSERT, UPDATE, DELETE on all fuel_ tables

### accountant policies
- SELECT on all fuel_ tables
- INSERT and UPDATE on fuel_payments (reconciliation)
- INSERT on fuel_sms_log
- No UPDATE on fuel_customers.credit_limit
- No access to fuel_settings

### attendant policies
- SELECT on fuel_customers, fuel_fuel_types, fuel_inventory
- INSERT on fuel_sales WHERE attendant_id = auth.uid()
- INSERT and UPDATE on fuel_shifts WHERE attendant_id = auth.uid()
- No access to fuel_payments, fuel_settings, fuel_audit_log, reports

## 4. Supabase Edge Functions

### 4.1 mpesa-c2b-callback
Trigger: POST webhook from Safaricom Daraja (Paybill/Till payment)

Algorithm:
1. Validate Authorization header (Daraja security credential)
2. Extract: TransID, TransAmount, MSISDN, BillRefNumber, TransTime
3. Generate idempotency_key = "c2b:{TransID}"
4. Check fuel_payments for existing idempotency_key - if found return ResultCode:0 immediately (idempotent)
5. INSERT into fuel_payments (amount, channel, idempotency_key, status=pending, raw_phone=MSISDN, raw_reference=BillRefNumber)
6. Call reconcile-payment with new payment_id
7. Return {ResultCode:0, ResultDesc:"Accepted"} within 5 seconds

### 4.2 mpesa-stk-push
Trigger: Called from Next.js API route POST /api/payments/stk-push

Algorithm:
1. Load Daraja credentials from Supabase Vault
2. Get OAuth token (cached with 55-min TTL, refresh if expired)
3. Build STK Push payload: BusinessShortCode, Password=base64(ShortCode+Passkey+Timestamp), Timestamp, Amount, PhoneNumber
4. POST to Daraja STK Push endpoint
5. INSERT fuel_stk_push_requests with CheckoutRequestID, status=pending
6. Return {checkoutRequestId, merchantRequestId}

### 4.3 mpesa-stk-callback
Trigger: POST webhook from Daraja after customer completes/cancels STK Push

Algorithm:
1. Extract CheckoutRequestID and ResultCode from callback body
2. Find fuel_stk_push_requests by checkout_request_id
3. If ResultCode = 0 (success):
   a. Generate idempotency_key = "stk:{CheckoutRequestID}"
   b. INSERT fuel_payments with customer_id from STK request, status=pending
   c. Call reconcile-payment
   d. UPDATE fuel_stk_push_requests status=success
4. If ResultCode != 0: UPDATE fuel_stk_push_requests status=failed/cancelled
5. Return HTTP 200

### 4.4 reconcile-payment (Auto-Reconciliation Engine)
Trigger: Called internally after any payment ingestion

Algorithm:
1. Load payment record by payment_id
2. IDEMPOTENCY CHECK: if payment.status = reconciled, return immediately
3. STEP 1 - Phone match:
   SELECT * FROM fuel_customers WHERE phone = normalise(payment.raw_phone) AND is_active = true
   normalise: strip spaces, ensure +254 prefix
   If exactly 1 match -> postPayment(payment, customer)
4. STEP 2 - Reference match:
   SELECT * FROM fuel_customers WHERE account_ref ILIKE payment.raw_reference
   If exactly 1 match -> postPayment(payment, customer)
5. STEP 3 - Name keyword match:
   SELECT * FROM fuel_customers WHERE payment.raw_narration ILIKE '%' || full_name || '%'
   If exactly 1 match -> postPayment(payment, customer)
6. If 0 or >1 matches: leave payment.status = pending (Pending Reconciliation Queue)

postPayment(payment, customer):
  BEGIN TRANSACTION
    UPDATE fuel_payments SET customer_id=customer.id, status=reconciled, reconciled_at=now()
    UPDATE fuel_customers SET outstanding_balance = outstanding_balance - payment.amount WHERE id=customer.id
    INSERT fuel_inventory_log (if applicable)
  COMMIT
  Broadcast Supabase Realtime event on fuel_payments channel
  Call send-sms (payment confirmation to customer)

### 4.5 send-sms
Algorithm:
1. Load SMS provider setting from fuel_settings WHERE key='sms_provider'
2. Load API credentials from Supabase Vault
3. Validate phone number - if invalid, INSERT fuel_sms_log status=skipped and return
4. Call provider adapter (AfricasTalkingProvider or TwilioProvider)
5. INSERT fuel_sms_log with status=sent or failed

### 4.6 import-bank-statement
Algorithm:
1. Receive file buffer from Next.js API route
2. Compute SHA-256 hash of file buffer
3. Check fuel_bank_imports for existing sha256_hash - if found return 409 Conflict with original import details
4. Detect bank format by fingerprinting header row column names
5. Parse rows into BankTransaction objects using bank-specific column mapping
6. INSERT fuel_bank_imports record
7. For each BankTransaction: INSERT fuel_bank_transactions
8. For each BankTransaction with credit_amount > 0:
   a. Generate idempotency_key = "bank:{import_id}:{row_index}:{reference}"
   b. INSERT fuel_payments (status=pending)
   c. Call reconcile-payment
9. Return parse summary: {total_rows, parsed_rows, error_rows, parse_errors[]}

## 5. Bank Statement Parser Design

### 5.1 Bank Format Detection
Detect bank by fingerprinting the header row of the uploaded file:

| Bank | Header Fingerprint Keywords |
|------|-----------------------------|
| KCB | Value Date, Debit Amount, Credit Amount, Transaction Reference |
| Equity | Date, Description, Dr, Cr, Balance |
| Co-op | Trans Date, Particulars, Debit, Credit |
| NCBA | Transaction Date, Narration, Debit, Credit, Running Balance |
| Absa | Date, Transaction Details, Debit Amount, Credit Amount |
| Standard Chartered | Booking Date, Description, Debit, Credit |
| DTB | Date, Narration, Debit, Credit, Balance |
| Family Bank | Date, Description, Withdrawals, Deposits |

### 5.2 BankTransaction Type

```typescript
interface BankTransaction {
  transactionDate: Date      // parsed from bank date column
  creditAmount: number       // 0 if debit-only row
  debitAmount: number        // 0 if credit-only row
  reference: string          // transaction reference/ID
  narration: string          // description/narration text
}
```

### 5.3 Pretty_Printer (Round-Trip Guarantee)
- Output CSV header: `date,credit_amount,debit_amount,reference,narration`
- Date format: ISO 8601 (YYYY-MM-DD) - deterministic, no locale ambiguity
- Numeric format: toFixed(2) - deterministic 2 decimal places
- String fields: CSV-escaped (double-quote wrapping if contains comma/newline/double-quote)
- Round-trip property: `parse(prettyPrint(T)) === T` for all valid T

## 6. Frontend Page Structure (Next.js App Router)

```
app/
  (auth)/
    login/page.tsx              - Cutting-edge login page
    reset-password/page.tsx     - Request password reset
    update-password/page.tsx    - Set new password from reset link
  (dashboard)/
    layout.tsx                  - Sidebar nav + topbar, role-aware menu
    page.tsx                    - Real-time dashboard (dealer_admin/accountant)
    sales/
      page.tsx                  - POS new sale form (all roles)
      history/page.tsx          - Sales history table with filters
    customers/
      page.tsx                  - Customer list with search/filter
      new/page.tsx              - Create customer (dealer_admin only)
      [id]/page.tsx             - Customer detail: statement, balance, debt aging
    payments/
      page.tsx                  - All payments list
      reconcile/page.tsx        - Pending reconciliation queue (accountant+)
      stk-push/page.tsx         - Initiate STK Push (accountant+)
      import/page.tsx           - Bank statement upload (accountant+)
    inventory/
      page.tsx                  - Stock levels per fuel type
      deliveries/page.tsx       - Record fuel delivery (dealer_admin)
      log/page.tsx              - Inventory history log
    reports/
      page.tsx                  - Reports hub (accountant+)
      sales/page.tsx            - Daily/weekly/monthly sales report
      payments/page.tsx         - Payment collection by channel
      debt-aging/page.tsx       - Customer debt aging report
      inventory/page.tsx        - Inventory consumption report
      shifts/page.tsx           - Shift summary report
    shifts/
      page.tsx                  - Open/close shift, shift list
    settings/                   - dealer_admin only
      page.tsx                  - Settings hub
      mpesa/page.tsx            - Daraja API credentials
      sms/page.tsx              - SMS provider config
      fuel-prices/page.tsx      - Set price per litre per fuel type
      users/page.tsx            - User management
      thresholds/page.tsx       - Low-stock alert thresholds
```

### Key Component Patterns

- **Dashboard**: Server component fetches initial data; Client component subscribes to Supabase Realtime channels for fuel_sales and fuel_payments INSERT events
- **POS Sales form**: Client component with optimistic UI, calls POST /api/sales
- **Reconciliation queue**: Client component with Realtime subscription on fuel_payments WHERE status=pending
- **All data tables**: TanStack Table v8 with server-side pagination
- **Reports**: Server components with date-range params, export buttons trigger client-side PDF/Excel generation

## 7. Login Page Design (Cutting-Edge)

### Visual Design
- Full-screen split layout: left 60% brand panel, right 40% login form
- **LEFT PANEL**: Deep navy (#0F172A) to amber (#F59E0B) animated gradient background
  - Large "Alpha Fuel Manager" wordmark with animated fuel-drop SVG icon
  - Tagline: "Fuel your business. Control your cash."
  - Subtle animated particle/wave effect using CSS keyframes
- **RIGHT PANEL**: White/slate-50 background
  - Centered glassmorphism card: backdrop-blur-md, bg-white/80, border border-white/20, rounded-2xl, shadow-2xl
  - Logo mark at top of card
  - Floating label inputs for Email and Password
  - Eye icon toggle (Lucide Eye/EyeOff) for password visibility
  - "Forgot password?" link below password field
  - Full-width amber gradient submit button with Lucide Loader2 spin on loading
  - Error state: red border on inputs + CSS shake animation (animate-shake)
- **RESPONSIVE**: On mobile, brand panel collapses to top banner strip, form takes full width

### Auth Flow
1. User submits email + password
2. Call `supabase.auth.signInWithPassword({ email, password })`
3. On success: read role from `session.user.app_metadata.role`
4. Redirect to /dashboard
5. On error: display generic "Invalid email or password" (no credential enumeration)

## 8. Real-Time Architecture

Supabase Realtime channels subscribed by the dashboard client:

| Channel | Table | Events | Dashboard Effect |
|---------|-------|--------|-----------------|
| dashboard-sales | fuel_sales | INSERT | Update today litres + KES KPI cards |
| dashboard-payments | fuel_payments | INSERT, UPDATE | Update payments received + pending queue count |
| dashboard-inventory | fuel_inventory | UPDATE | Trigger low-stock banner if below threshold |
| reconcile-queue | fuel_payments | INSERT | Update pending queue list in real time |

Client pattern (React):
```typescript
useEffect(() => {
  const channel = supabase.channel('dashboard-sales')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fuel_sales' },
      (payload) => updateKpis(payload.new))
    .subscribe()
  return () => supabase.removeChannel(channel)
}, [])
```

KPI cards update within 3 seconds of a new sale or payment being posted.

## 9. SMS Provider Adapter Pattern

```typescript
interface SmsProvider {
  sendSms(to: string, message: string): Promise<SmsResult>
}

interface SmsResult {
  success: boolean
  messageId?: string
  error?: string
}

class AfricasTalkingProvider implements SmsProvider {
  constructor(
    private apiKey: string,
    private username: string,
    private senderId: string
  ) {}
  async sendSms(to: string, message: string): Promise<SmsResult> {
    // POST to https://api.africastalking.com/version1/messaging
    // Headers: apiKey, Accept: application/json
    // Body: username, to, message, from (senderId)
  }
}

class TwilioProvider implements SmsProvider {
  constructor(
    private accountSid: string,
    private authToken: string,
    private fromNumber: string
  ) {}
  async sendSms(to: string, message: string): Promise<SmsResult> {
    // POST to https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json
    // Basic auth: accountSid:authToken
    // Body: From, To, Body
  }
}

function getSmsProvider(
  provider: 'africas_talking' | 'twilio',
  credentials: Record<string, string>
): SmsProvider {
  if (provider === 'africas_talking')
    return new AfricasTalkingProvider(credentials.apiKey, credentials.username, credentials.senderId)
  return new TwilioProvider(credentials.accountSid, credentials.authToken, credentials.fromNumber)
}
```

## 10. Property-Based Testing Design

Framework: fast-check (TypeScript)

### Property 1: Balance Integrity
Generator: arbitrary sequence of credit sales and payments for a customer
Property: after applying all transactions, outstanding_balance === sum(credit_sales) - sum(payments)

```typescript
fc.assert(fc.asyncProperty(
  fc.array(fc.record({
    type: fc.constantFrom('sale', 'payment'),
    amount: fc.float({ min: 1, max: 100000, noNaN: true })
  })),
  async (transactions) => {
    const sales = transactions.filter(t => t.type === 'sale').reduce((s, t) => s + t.amount, 0)
    const payments = transactions.filter(t => t.type === 'payment').reduce((s, t) => s + t.amount, 0)
    const balance = await getCustomerBalance(testCustomerId)
    return Math.abs(balance - (sales - payments)) < 0.01
  }
))
```

### Property 2: Idempotency
Generator: arbitrary payment event + arbitrary duplicate count (1-10)
Property: posting same idempotency_key N times results in exactly 1 payment record

```typescript
fc.assert(fc.asyncProperty(
  fc.record({ idempotencyKey: fc.string({ minLength: 1 }), amount: fc.float({ min: 1 }) }),
  fc.integer({ min: 1, max: 10 }),
  async (payment, duplicateCount) => {
    for (let i = 0; i < duplicateCount; i++) await postPayment(payment)
    const count = await countPayments(payment.idempotencyKey)
    return count === 1
  }
))
```

### Property 3: Bank Statement Round-Trip
Generator: arbitrary list of BankTransaction objects
Property: parse(prettyPrint(transactions)) deep-equals transactions

```typescript
fc.assert(fc.property(
  fc.array(fc.record({
    transactionDate: fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 0, 1) }),
    creditAmount: fc.float({ min: 0, max: 10000000, noNaN: true }),
    debitAmount: fc.float({ min: 0, max: 10000000, noNaN: true }),
    reference: fc.string(),
    narration: fc.string()
  })),
  (transactions) => deepEqual(parse(prettyPrint(transactions)), transactions)
))
```

## 11. Security Design

### JWT Role Claims
- Role stored in `auth.users.app_metadata.role`
- Set via Supabase Auth admin API when creating users
- Read in RLS: `auth.jwt() -> 'app_metadata' ->> 'role'`

### Supabase Vault Secrets
- DARAJA_CONSUMER_KEY
- DARAJA_CONSUMER_SECRET
- DARAJA_PAYBILL_NUMBER
- DARAJA_PASSKEY
- AT_API_KEY (Africa's Talking)
- AT_USERNAME
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_FROM_NUMBER

### Daraja Webhook Security
- Validate Authorization header on C2B callback
- IP whitelist: Safaricom production IP ranges
- Return ResultCode:0 within 5 seconds to prevent Daraja timeout

### Next.js API Route Security
- Every API route calls `supabase.auth.getUser()` before processing
- Role checked against required minimum role for the operation
- Return 401 if no session, 403 if insufficient role

### Input Validation
- All API inputs validated with Zod schemas
- Phone numbers normalised to E.164 format (+254XXXXXXXXX)
- Numeric amounts validated as positive finite numbers
- File uploads: MIME type check (text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet), max 10MB

## 12. M-Pesa Integration Design

### OAuth Token Management
- POST to `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`
- Basic auth: base64(ConsumerKey:ConsumerSecret)
- Cache token in Deno KV with 55-minute TTL (token expires in 60 min)
- Refresh automatically before expiry

### C2B RegisterURL (one-time setup)
- POST to `/mpesa/c2b/v1/registerurl`
- Register ValidationURL and ConfirmationURL pointing to mpesa-c2b-callback Edge Function
- Called once during system setup from Settings > M-Pesa

### Environment Switching
- MPESA_ENV=sandbox uses https://sandbox.safaricom.co.ke
- MPESA_ENV=production uses https://api.safaricom.co.ke
- Controlled via Supabase Edge Function environment variable

