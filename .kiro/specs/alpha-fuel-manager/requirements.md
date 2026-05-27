# Requirements Document  Alpha Fuel Manager
## Introduction

Alpha Fuel Manager is a fuel dealer payment and sales management platform built for the Kenyan market. The system serves a single fuel dealer (the admin/owner) who sells fuel to approximately 100 customers. It handles fuel sales recording (pay-now and pay-later/credit), multi-channel payment collection across all major Kenyan payment rails (M-Pesa Paybill, M-Pesa Till, M-Pesa STK Push, PesaLink, EFT/RTGS bank transfers, direct bank deposits, and cash), automatic reconciliation of incoming payments to customer accounts, real-time dealer dashboard, customer account management, and fuel inventory tracking.

The system is built on Next.js (TypeScript) for the frontend, Supabase (PostgreSQL + Edge Functions + Realtime) for the backend, Safaricom Daraja API for M-Pesa integration, Africa's Talking or Twilio for SMS, and uses the `fuel_` prefix for all database tables. Role-based access control supports three roles: `dealer_admin` (full access), `accountant` (reports and reconciliation), and `attendant` (sales and payments view only).

---
## Glossary

- **System**: The Alpha Fuel Manager platform as a whole.
- **Dealer**: The fuel station owner/admin who owns and operates the system.
- **Customer**: A registered individual or company that purchases fuel from the Dealer, with a managed account.
- **Attendant**: A fuel station employee who records sales at the point of sale.
- **Accountant**: A user with the `accountant` role who can access reports and manage reconciliation but cannot modify customer credit settings.
- **Sale**: A single fuel dispensing transaction recorded against a Customer account.
- **Pay-Now Sale**: A Sale where the Customer pays the full amount immediately at the point of sale.
- **Credit Sale**: A Sale where the Customer takes fuel on credit; the amount is added to their Outstanding Balance.
- **Outstanding Balance**: The total amount a Customer currently owes the Dealer, calculated as the sum of all Credit Sales minus the sum of all confirmed Payments received.
- **Credit Limit**: The maximum Outstanding Balance permitted for a Customer before further Credit Sales are blocked.
- **Payment**: A confirmed receipt of funds from a Customer through any supported payment channel.
- **Payment Channel**: A method through which a Payment is received (M-Pesa Paybill, M-Pesa Till, M-Pesa STK Push, PesaLink, EFT/RTGS, Bank Deposit, Cash).
- **Reconciliation**: The process of matching an incoming Payment to a specific Customer account and posting it to reduce their Outstanding Balance.
- **Auto-Reconciliation Engine**: The subsystem that automatically matches and posts incoming Payments to Customer accounts.
- **Pending Reconciliation Queue**: A holding area for Payments that could not be automatically matched to a Customer.
- **Daraja API**: Safaricom's official API for M-Pesa integrations, used for C2B callbacks and STK Push.
- **C2B Callback**: A webhook notification sent by Safaricom to the System when a Customer pays via M-Pesa Paybill or Till.
- **STK Push**: An M-Pesa payment request initiated by the Dealer to a Customer's phone number via the Daraja API.
- **PesaLink**: An inter-bank instant payment service operated by IPSL, supported by all major Kenyan banks.
- **EFT**: Electronic Funds Transfer  a direct bank-to-bank transfer method.
- **RTGS**: Real-Time Gross Settlement  a high-value direct bank-to-bank transfer method.
- **Bank Statement Import**: The process of uploading a CSV or Excel bank statement file to import transactions for banks without real-time API integration.
- **BankTransaction**: A parsed record from a bank statement containing: transaction date, credit amount, debit amount, transaction reference, and narration.
- **Idempotency Key**: A unique identifier attached to a Payment event to prevent the same payment from being posted more than once.
- **Dashboard**: The real-time web interface used by the Dealer to monitor sales, payments, and customer balances.
- **SMS_Service**: The subsystem responsible for sending SMS notifications to Customers via Africa's Talking or Twilio.
- **Pretty_Printer**: The subsystem that formats BankTransaction objects back into a valid CSV file.
- **Parser**: The subsystem that parses CSV or Excel bank statement files into BankTransaction objects.
- **Inventory**: The tracked stock of fuel held at the station, measured in litres per Fuel_Type.
- **Fuel_Type**: An enumerated category of fuel product (e.g., Petrol, Diesel, Kerosene, Premium Diesel).
- **RLS**: Row-Level Security  Supabase/PostgreSQL policy mechanism used to enforce data access control at the database level.
- **Debt Aging**: The classification of outstanding Customer balances by how long they have been overdue (e.g., 0-30 days, 31-60 days, 61-90 days, 90+ days).
- **Shift**: A defined working period for an Attendant during which sales are recorded.

---

## Requirements

---

### Requirement 1: Authentication & Security

**User Story:** As a Dealer, I want a secure, modern login page so that only authorised users can access the system and each user sees only what their role permits.

#### Acceptance Criteria

1. THE System SHALL provide a login page built with Next.js and Supabase Auth that accepts an email address and password.
2. WHEN a user submits valid credentials, THE System SHALL authenticate the user via Supabase Auth and establish a secure session.
3. WHEN a user submits invalid credentials, THE System SHALL display a descriptive error message and SHALL NOT reveal whether the email or the password was incorrect.
4. WHEN a user session expires or the user logs out, THE System SHALL invalidate the session token and redirect the user to the login page.
5. THE System SHALL enforce role-based access control using three roles: `dealer_admin`, `accountant`, and `attendant`, enforced at both the API layer and via Supabase RLS policies on all `fuel_` tables.
6. WHEN a user with the `attendant` role attempts to access a route restricted to `accountant` or `dealer_admin`, THE System SHALL return an HTTP 403 response and display an access-denied message.
7. WHEN a user with the `accountant` role attempts to access a route restricted to `dealer_admin`, THE System SHALL return an HTTP 403 response and display an access-denied message.
8. THE System SHALL provide a password-reset flow that sends a reset link to the user's registered email address via Supabase Auth.
9. WHEN a password-reset link is used more than once or after it has expired, THE System SHALL reject the request and prompt the user to request a new reset link.
10. THE System SHALL display the authenticated user's name and role on every authenticated page.

---

### Requirement 2: Fuel Sales Management (Point of Sale)

**User Story:** As an Attendant, I want to record fuel sales against registered customers so that every dispensing transaction is captured accurately in real time.

#### Acceptance Criteria

1. WHEN an Attendant initiates a new sale, THE System SHALL present a form to select a registered Customer, Fuel_Type, quantity in litres, and unit price per litre.
2. THE System SHALL calculate the total sale amount as `quantity_litres × unit_price` and display it before the Attendant confirms the sale.
3. WHEN an Attendant records a Pay-Now Sale, THE System SHALL require selection of a Payment Channel (Cash, M-Pesa STK Push, or other supported channel) and SHALL post the payment immediately upon confirmation.
4. WHEN an Attendant records a Credit Sale, THE System SHALL add the sale amount to the Customer's Outstanding Balance and SHALL record the sale with a `credit` status.
5. WHEN a Credit Sale is submitted and the resulting Outstanding Balance would exceed the Customer's Credit Limit, THE System SHALL reject the sale and display the current Outstanding Balance, Credit Limit, and the amount by which the limit would be exceeded.
6. THE System SHALL support the following Fuel_Type values: Petrol, Diesel, Kerosene, and Premium Diesel.
7. WHEN a sale is confirmed, THE System SHALL deduct the sold quantity in litres from the Inventory for the corresponding Fuel_Type atomically within the same database transaction as the Sale record.
8. WHEN a sale is confirmed, THE System SHALL record the Attendant's identity and the active Shift identifier against the sale record.
9. THE System SHALL allow an Attendant to open and close a Shift, recording the start time and end time.
10. WHILE a Shift is open, THE System SHALL associate all sales recorded by that Attendant with the active Shift.
11. IF a sale is submitted when no Shift is open for the Attendant, THEN THE System SHALL prompt the Attendant to open a Shift before proceeding.

---

### Requirement 3: Customer Account Management

**User Story:** As a Dealer Admin, I want to register and manage customer accounts so that I can track each customer's credit, outstanding balance, and transaction history.

#### Acceptance Criteria

1. THE System SHALL allow a `dealer_admin` user to create a Customer record containing: full name, phone number, email address (optional), company name (optional), and Credit Limit.
2. THE System SHALL allow a `dealer_admin` user to edit any field of an existing Customer record, including the Credit Limit.
3. WHEN a `dealer_admin` updates a Customer's Credit Limit, THE System SHALL record the previous value, the new value, the timestamp, and the identity of the user who made the change in an audit log stored in the `fuel_audit_log` table.
4. WHEN an `accountant` or `attendant` user attempts to modify a Customer's Credit Limit, THE System SHALL reject the request with an HTTP 403 response.
5. THE System SHALL display the real-time Outstanding Balance for each Customer, calculated as the sum of all Credit Sale amounts minus the sum of all confirmed Payment amounts for that Customer.
6. THE System SHALL provide a Customer Statement view listing all Sales and Payments for a Customer in chronological order, showing the running balance after each transaction.
7. THE System SHALL provide a Debt Aging report per Customer classifying the Outstanding Balance into buckets: 0–30 days, 31–60 days, 61–90 days, and 90+ days, based on the age of each unpaid Credit Sale.
8. THE System SHALL allow a `dealer_admin` to deactivate a Customer, preventing new sales from being recorded against the Customer's account without deleting historical data.
9. WHEN a deactivated Customer is selected during sale entry, THE System SHALL reject the sale and display a message indicating the Customer account is inactive.
10. THE System SHALL support at least 100 Customer records and SHALL return any Customer-facing query result within 500 ms under normal operating conditions.

---

### Requirement 4: Multi-Channel Payment Collection

**User Story:** As a Dealer, I want to collect payments through all major Kenyan payment channels so that customers can pay using whichever method is convenient for them.

#### Acceptance Criteria

1. THE System SHALL support the following Payment Channels: M-Pesa Paybill, M-Pesa Till, M-Pesa STK Push, PesaLink, EFT/RTGS, Direct Bank Deposit, and Cash.
2. WHEN Safaricom sends a C2B callback to the System's Daraja webhook endpoint for a Paybill or Till payment, THE System SHALL acknowledge the callback with an HTTP 200 response within 5 seconds and enqueue the payment for reconciliation.
3. WHEN a `dealer_admin` or `accountant` initiates an STK Push for a Customer, THE System SHALL call the Daraja STK Push API with the Customer's phone number and the specified amount, and SHALL record the `CheckoutRequestID` as the Idempotency Key.
4. WHEN the Daraja STK Push callback confirms a successful payment, THE System SHALL enqueue the payment for reconciliation using the recorded `CheckoutRequestID` as the Idempotency Key.
5. WHEN the Daraja STK Push callback reports a failed or cancelled payment, THE System SHALL update the STK Push record status to `failed` and notify the initiating user via an in-app notification.
6. WHEN a Cash payment is recorded manually by an `attendant` or `accountant`, THE System SHALL require the amount, the Customer, and the recording user's identity, and SHALL post the payment immediately to the Customer's account.
7. WHEN a bank statement is imported, THE System SHALL extract BankTransaction records and enqueue each record with a credit amount greater than zero as a Payment event for the Auto-Reconciliation Engine.
8. THE System SHALL assign a unique Idempotency Key to every Payment event at the point of ingestion before enqueuing it for reconciliation.

---

### Requirement 5: Auto-Reconciliation Engine

**User Story:** As a Dealer, I want incoming payments to be automatically matched to customer accounts so that outstanding balances are updated in real time without manual effort.

#### Acceptance Criteria

1. WHEN a Payment event is enqueued, THE Auto-Reconciliation Engine SHALL attempt to match it to a Customer using the following priority order: (1) exact phone number match, (2) account reference or narration match against the Customer's account number, (3) narration keyword match against the Customer's registered name.
2. WHEN the Auto-Reconciliation Engine finds exactly one matching Customer, THE Auto-Reconciliation Engine SHALL post the Payment to that Customer's account and reduce the Outstanding Balance by the payment amount.
3. WHEN the Auto-Reconciliation Engine finds zero matching Customers or more than one matching Customer, THE Auto-Reconciliation Engine SHALL place the Payment in the Pending Reconciliation Queue without posting it.
4. WHEN a Payment is about to be posted, THE Auto-Reconciliation Engine SHALL verify that the Payment's Idempotency Key does not already exist in the `fuel_payments` table, and SHALL reject the posting if the key already exists.
5. THE Auto-Reconciliation Engine SHALL process each enqueued Payment event exactly once, even if the same event is delivered more than once by the upstream source.
6. WHEN a Payment is successfully posted to a Customer account, THE System SHALL update the Customer's Outstanding Balance in real time via Supabase Realtime.
7. THE System SHALL allow an `accountant` or `dealer_admin` to view the Pending Reconciliation Queue, displaying each unmatched Payment's amount, channel, reference, narration, and received timestamp.
8. WHEN an `accountant` or `dealer_admin` manually assigns a Payment from the Pending Reconciliation Queue to a Customer, THE System SHALL post the Payment to that Customer's account and remove it from the Pending Reconciliation Queue.
9. WHEN a Payment in the Pending Reconciliation Queue is manually assigned, THE Auto-Reconciliation Engine SHALL verify the Idempotency Key and SHALL reject the posting if the key already exists in the `fuel_payments` table.
10. THE System SHALL ensure that every Payment record in the `fuel_payments` table has exactly one of the following statuses: `reconciled` or `pending`, and no Payment record SHALL exist without one of these two statuses.

---

### Requirement 6: Bank Statement Import

**User Story:** As an Accountant, I want to upload bank statement files so that payments received via PesaLink, EFT/RTGS, and direct bank deposits are imported and queued for reconciliation automatically.

#### Acceptance Criteria

1. THE System SHALL accept bank statement file uploads in CSV and Excel (.xlsx) formats via the Bank Statement Import page.
2. WHEN a bank statement file is uploaded, THE Parser SHALL parse the file into a list of BankTransaction records, each containing: transaction date, credit amount, debit amount, transaction reference, and narration.
3. WHEN the Parser encounters a row that does not conform to the expected format for the detected bank, THE Parser SHALL skip the row, record the row number and reason in a parse error log, and continue processing the remaining rows.
4. THE Parser SHALL support statement formats from the following banks: KCB, Equity, Co-op, NCBA, Absa, Standard Chartered, DTB, and Family Bank.
5. WHEN parsing is complete, THE System SHALL display a summary showing the total number of rows processed, the number of BankTransaction records successfully extracted, and the number of rows skipped due to parse errors.
6. WHEN a BankTransaction record has a credit amount greater than zero, THE System SHALL enqueue the record as a Payment event for the Auto-Reconciliation Engine.
7. THE Pretty_Printer SHALL format a list of BankTransaction records into a valid CSV file with the columns: date, credit_amount, debit_amount, reference, narration.
8. FOR ALL valid lists of BankTransaction records, parsing a CSV file produced by the Pretty_Printer SHALL yield a list of BankTransaction records equivalent to the original input (round-trip property).
9. WHEN a bank statement file is uploaded whose SHA-256 hash matches a previously imported file, THE System SHALL reject the upload and display a message identifying the original import date and the user who performed the original import.

---

### Requirement 7: Real-Time Dealer Dashboard

**User Story:** As a Dealer Admin, I want a real-time dashboard so that I can monitor sales, payments, and customer balances at a glance without refreshing the page.

#### Acceptance Criteria

1. THE Dashboard SHALL display the following KPI cards updated in real time via Supabase Realtime: today's total sales in litres, today's total sales in KES, today's total payments received in KES, total Outstanding Balance across all Customers, and count of Payments in the Pending Reconciliation Queue.
2. WHEN a new Sale or Payment is posted, THE Dashboard SHALL update the affected KPI cards within 3 seconds without requiring a page reload.
3. THE Dashboard SHALL display a Recent Transactions feed showing the last 20 Sales and Payments in reverse chronological order, including Customer name, amount, Payment Channel, and timestamp.
4. THE Dashboard SHALL display a Top Debtors list showing the 10 Customers with the highest Outstanding Balance, sorted in descending order by Outstanding Balance.
5. THE Dashboard SHALL display a Payment Channel Breakdown chart showing the total amount received per Payment Channel for the current calendar day.
6. WHEN a `dealer_admin` views the Dashboard, THE System SHALL display all KPI cards, the Recent Transactions feed, the Top Debtors list, and the Payment Channel Breakdown chart.
7. WHEN an `accountant` views the Dashboard, THE System SHALL display all KPI cards and the Pending Reconciliation Queue count.
8. WHEN an `attendant` views the Dashboard, THE System SHALL display only the KPI cards for today's sales attributed to the Attendant's own active or most recent Shift.

---

### Requirement 8: Fuel Inventory Management

**User Story:** As a Dealer Admin, I want to track fuel stock levels so that I always know how much fuel is available and can be alerted when stock is running low.

#### Acceptance Criteria

1. THE System SHALL maintain one Inventory record per Fuel_Type tracking the current stock level in litres.
2. WHEN a Sale is confirmed, THE System SHALL deduct the sold quantity in litres from the Inventory for the corresponding Fuel_Type atomically within the same database transaction as the Sale record.
3. IF a Sale is submitted and the requested quantity in litres exceeds the current Inventory for the selected Fuel_Type, THEN THE System SHALL reject the sale and display the current available stock in litres.
4. THE System SHALL ensure that the Inventory for any Fuel_Type SHALL NOT fall below zero litres at any time.
5. WHEN the Inventory for a Fuel_Type falls below the configured low-stock threshold for that Fuel_Type, THE System SHALL send a low-stock alert SMS to the `dealer_admin` and display a warning banner on the Dashboard.
6. THE System SHALL allow a `dealer_admin` to record a fuel delivery by specifying the Fuel_Type, quantity delivered in litres, delivery date, and supplier reference.
7. WHEN a fuel delivery is recorded, THE System SHALL add the delivered quantity to the Inventory for the corresponding Fuel_Type.
8. THE System SHALL maintain an Inventory history log in the `fuel_inventory_log` table recording every stock change with: timestamp, Fuel_Type, quantity change (positive for delivery, negative for sale), resulting stock balance, and the user or system event that caused the change.
9. THE System SHALL allow a `dealer_admin` or `accountant` to view the Inventory history log filtered by Fuel_Type and date range.

---

### Requirement 9: Reports & Analytics

**User Story:** As an Accountant or Dealer Admin, I want comprehensive reports so that I can analyse sales performance, payment collection, customer debt, and inventory consumption.

#### Acceptance Criteria

1. THE System SHALL provide a Daily Sales Report showing total litres sold and total KES collected per Fuel_Type for a selected date.
2. THE System SHALL provide a Weekly Sales Report and a Monthly Sales Report aggregating total litres sold and total KES collected per Fuel_Type over the selected period.
3. THE System SHALL provide a Payment Collection Report showing total payments received per Payment Channel for a selected date range.
4. THE System SHALL provide a Customer Debt Aging Report listing all Customers with an Outstanding Balance greater than zero, with the balance classified into the buckets: 0–30 days, 31–60 days, 61–90 days, and 90+ days.
5. THE System SHALL provide an Inventory Consumption Report showing litres consumed per Fuel_Type over a selected date range, including opening stock, total deliveries, total sales, and closing stock.
6. THE System SHALL provide a Shift Summary Report per Attendant showing total sales in litres, total sales in KES, number of transactions, and Payment Channels used during a selected Shift.
7. THE System SHALL allow any report to be exported as a PDF file.
8. THE System SHALL allow any report to be exported as an Excel (.xlsx) file.
9. WHEN a `dealer_admin` or `accountant` requests a report export, THE System SHALL generate the file and initiate a browser download within 10 seconds for reports covering up to 12 months of data.
10. WHEN a user with the `attendant` role attempts to access any report page or report API endpoint, THE System SHALL reject the request with an HTTP 403 response.

---

### Requirement 10: SMS Notifications

**User Story:** As a Dealer, I want SMS notifications sent to customers automatically so that customers are informed of payments received, credit sales, and outstanding balance reminders without manual effort.

#### Acceptance Criteria

1. WHEN a Payment is successfully reconciled to a Customer account, THE SMS_Service SHALL send an SMS to the Customer's registered phone number confirming the payment amount, the Payment Channel, and the updated Outstanding Balance.
2. WHEN a Credit Sale is recorded against a Customer, THE SMS_Service SHALL send an SMS to the Customer's registered phone number stating the Fuel_Type, quantity in litres, amount added to the balance, and the new Outstanding Balance.
3. WHEN a Customer's Outstanding Balance exceeds 80% of the Customer's Credit Limit, THE SMS_Service SHALL send a credit limit warning SMS to the Customer's registered phone number stating the current Outstanding Balance and the Credit Limit.
4. THE System SHALL allow a `dealer_admin` to trigger an Outstanding Balance reminder SMS to one or more selected Customers, including the current Outstanding Balance and a payment instruction message.
5. THE SMS_Service SHALL support Africa's Talking and Twilio as interchangeable SMS providers, selectable via the Settings module without requiring code changes.
6. WHEN an SMS fails to deliver after the provider's maximum retry attempts, THE System SHALL log the failure with the Customer identity, message content, provider error response, and timestamp, and SHALL display the failure in the Dashboard notification area.
7. WHEN a Customer's registered phone number is absent or invalid, THE SMS_Service SHALL skip the SMS, log the skip reason against the notification record, and SHALL NOT raise a system-level error.

---

### Requirement 11: Settings & Configuration

**User Story:** As a Dealer Admin, I want a settings module so that I can configure M-Pesa credentials, SMS providers, fuel prices, and user accounts without requiring code changes.

#### Acceptance Criteria

1. THE System SHALL provide a Settings page accessible only to users with the `dealer_admin` role.
2. WHEN a user with the `accountant` or `attendant` role attempts to access the Settings page or any settings API endpoint, THE System SHALL reject the request with an HTTP 403 response.
3. THE System SHALL allow a `dealer_admin` to configure the Daraja API credentials — Consumer Key, Consumer Secret, Paybill or Till number, and callback URL — stored as encrypted secrets in Supabase Vault.
4. THE System SHALL allow a `dealer_admin` to configure the SMS provider by selecting Africa's Talking or Twilio and entering the required API credentials, stored as encrypted secrets in Supabase Vault.
5. THE System SHALL allow a `dealer_admin` to set the unit price per litre for each Fuel_Type, with the new price taking effect on all sales recorded after the change is saved.
6. WHEN a fuel price is updated, THE System SHALL record the previous price, the new price, the effective timestamp, and the identity of the `dealer_admin` who made the change in the `fuel_audit_log` table.
7. THE System SHALL allow a `dealer_admin` to create new user accounts by specifying the user's full name, email address, and role (`dealer_admin`, `accountant`, or `attendant`).
8. THE System SHALL allow a `dealer_admin` to edit an existing user's full name, email address, and role.
9. THE System SHALL allow a `dealer_admin` to deactivate a user account, preventing the user from logging in without deleting the user's historical records.
10. WHEN a `dealer_admin` attempts to deactivate their own account, THE System SHALL reject the request and display an error message preventing self-deactivation.
11. THE System SHALL allow a `dealer_admin` to configure the low-stock alert threshold in litres per Fuel_Type for inventory notifications.

---

### Requirement 12: Balance Integrity (Correctness Property)

**User Story:** As a Dealer, I want the system to guarantee that every customer's outstanding balance is always mathematically correct so that I can trust the financial data at all times.

#### Acceptance Criteria

1. FOR ALL Customers, THE System SHALL maintain the invariant: `Outstanding Balance = SUM(Credit Sale amounts) − SUM(confirmed Payment amounts)` at all times.
2. WHEN a Credit Sale is posted, THE System SHALL update the Customer's Outstanding Balance atomically within the same database transaction as the Sale record.
3. WHEN a Payment is posted, THE System SHALL update the Customer's Outstanding Balance atomically within the same database transaction as the Payment record.
4. IF a database transaction that includes a Sale or Payment record fails to commit, THEN THE System SHALL roll back all changes including any Outstanding Balance update, leaving the balance unchanged from its pre-transaction value.

---

### Requirement 13: Idempotency & Duplicate Prevention (Correctness Property)

**User Story:** As a Dealer, I want the system to guarantee that no payment is ever posted more than once so that customer balances are never incorrectly reduced by duplicate entries.

#### Acceptance Criteria

1. THE System SHALL assign a unique Idempotency Key to every Payment event at the point of ingestion (C2B callback, STK Push callback, manual entry, or bank statement import row).
2. WHEN a Payment event is received with an Idempotency Key that already exists in the `fuel_payments` table, THE System SHALL discard the duplicate event and return a success acknowledgement to the caller without posting the payment again.
3. FOR ALL sequences of Payment events that include duplicate Idempotency Keys, THE System SHALL post each unique payment exactly once regardless of how many times the duplicate event is received.
4. THE System SHALL enforce Idempotency Key uniqueness at the database level via a unique constraint on the `idempotency_key` column of the `fuel_payments` table.

---

### Requirement 14: Role Enforcement (Correctness Property)

**User Story:** As a Dealer Admin, I want the system to strictly enforce role-based access so that attendants and accountants cannot perform actions outside their permitted scope.

#### Acceptance Criteria

1. WHEN a user with the `attendant` role attempts to modify a Customer's Credit Limit via any API endpoint, THE System SHALL reject the request with an HTTP 403 response.
2. WHEN a user with the `attendant` role attempts to access any report page or report API endpoint, THE System SHALL reject the request with an HTTP 403 response.
3. WHEN a user with the `attendant` role attempts to perform manual reconciliation via any API endpoint, THE System SHALL reject the request with an HTTP 403 response.
4. WHEN a user with the `attendant` role attempts to access the Settings page or any settings API endpoint, THE System SHALL reject the request with an HTTP 403 response.
5. WHEN a user with the `accountant` role attempts to modify a Customer's Credit Limit via any API endpoint, THE System SHALL reject the request with an HTTP 403 response.
6. WHEN a user with the `accountant` role attempts to access the Settings page or any settings API endpoint, THE System SHALL reject the request with an HTTP 403 response.
7. THE System SHALL enforce all role restrictions via Supabase RLS policies on the relevant `fuel_` tables in addition to API-layer checks, so that direct database access also respects role boundaries.
