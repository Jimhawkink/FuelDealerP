import { z } from "zod"

// ---- Common schemas ----

export const UuidSchema = z.string().uuid()

export const PhoneSchema = z
  .string()
  .min(9)
  .max(20)
  .regex(/^[+\d\s-]+$/, "Invalid phone number format")

export const AmountSchema = z
  .number()
  .positive("Amount must be positive")
  .finite("Amount must be finite")
  .max(100_000_000, "Amount exceeds maximum")

export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")

// ---- Sale schemas ----

export const PaymentChannelSchema = z.enum([
  "cash",
  "mpesa_paybill",
  "mpesa_till",
  "mpesa_stk",
  "pesalink",
  "eft_rtgs",
  "bank_deposit",
])

export const SaleTypeSchema = z.enum(["pay_now", "credit"])

export const CreateSaleSchema = z.object({
  customer_id: UuidSchema,
  fuel_type_id: UuidSchema,
  quantity_litres: z.number().positive().max(100_000),
  unit_price: z.number().positive().max(1_000),
  sale_type: SaleTypeSchema,
  payment_channel: PaymentChannelSchema.optional(),
  shift_id: UuidSchema.optional().nullable(),
})

// ---- Customer schemas ----

export const CreateCustomerSchema = z.object({
  full_name: z.string().min(2).max(100).trim(),
  phone: PhoneSchema,
  email: z.string().email().optional().nullable(),
  company_name: z.string().max(100).trim().optional().nullable(),
  credit_limit: z.number().min(0).max(100_000_000).default(0),
})

export const UpdateCustomerSchema = z.object({
  full_name: z.string().min(2).max(100).trim().optional(),
  phone: PhoneSchema.optional(),
  email: z.string().email().optional().nullable(),
  company_name: z.string().max(100).trim().optional().nullable(),
  credit_limit: z.number().min(0).max(100_000_000).optional(),
  is_active: z.boolean().optional(),
})

// ---- Payment schemas ----

export const ReconcilePaymentSchema = z.object({
  payment_id: UuidSchema,
  customer_id: UuidSchema,
})

export const StkPushSchema = z.object({
  customer_id: UuidSchema,
  amount: AmountSchema,
  phone: PhoneSchema,
})

// ---- Inventory schemas ----

export const DeliverySchema = z.object({
  fuel_type_id: UuidSchema,
  quantity_litres: z.number().positive().max(1_000_000),
  delivery_date: DateStringSchema,
  supplier_reference: z.string().min(1).max(100).trim(),
})

// ---- Settings schemas ----

export const MpesaSettingsSchema = z.object({
  consumer_key: z.string().min(1).max(200),
  consumer_secret: z.string().min(1).max(200),
  paybill_number: z.string().min(1).max(20),
  passkey: z.string().min(1).max(500),
  callback_url: z.string().url().optional(),
  environment: z.enum(["sandbox", "production"]).default("sandbox"),
})

export const SmsSettingsSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("africas_talking"),
    api_key: z.string().min(1).max(200),
    username: z.string().min(1).max(100),
    sender_id: z.string().max(20).optional(),
  }),
  z.object({
    provider: z.literal("twilio"),
    account_sid: z.string().min(1).max(100),
    auth_token: z.string().min(1).max(200),
    from_number: PhoneSchema,
  }),
])

export const FuelPriceSchema = z.object({
  fuel_type_id: UuidSchema,
  price_per_litre: z.number().positive().max(1_000),
})

// ---- SMS schemas ----

export const SmsReminderSchema = z.object({
  customer_ids: z.array(UuidSchema).min(1).max(100),
})

// ---- User schemas ----

export const CreateUserSchema = z.object({
  full_name: z.string().min(2).max(100).trim(),
  email: z.string().email(),
  role: z.enum(["dealer_admin", "accountant", "attendant"]),
  password: z.string().min(8).max(100),
})

export const UpdateUserSchema = z.object({
  full_name: z.string().min(2).max(100).trim().optional(),
  email: z.string().email().optional(),
  role: z.enum(["dealer_admin", "accountant", "attendant"]).optional(),
})
