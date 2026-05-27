/**
 * Unit Tests: Reconcile Payment Matching Logic
 *
 * Tests the phone normalisation, reference matching, and name keyword matching
 * logic used in the reconcile-payment Edge Function.
 */

import { describe, it, expect } from "vitest"

// ---- Phone normalisation (mirrors reconcile-payment/index.ts) ----

function normalisePhone(phone: string): string {
  let p = phone.replace(/\s+/g, "").replace(/[^+\d]/g, "")
  if (p.startsWith("+254")) return p
  if (p.startsWith("254")) return `+${p}`
  if (p.startsWith("0")) return `+254${p.slice(1)}`
  if (p.length === 9) return `+254${p}`
  return p
}

// ---- Matching logic (mirrors reconcile-payment/index.ts) ----

interface Customer {
  id: string
  full_name: string
  phone: string
  outstanding_balance: number
}

interface Payment {
  raw_phone?: string | null
  raw_reference?: string | null
  raw_narration?: string | null
}

function matchByPhone(payment: Payment, customers: Customer[]): Customer | null {
  if (!payment.raw_phone) return null
  const normalised = normalisePhone(payment.raw_phone)
  const matches = customers.filter(c => normalisePhone(c.phone) === normalised)
  return matches.length === 1 ? matches[0] : null
}

function matchByReference(payment: Payment, customers: Customer[]): Customer | null {
  if (!payment.raw_reference) return null
  const ref = payment.raw_reference.toLowerCase()
  const matches = customers.filter(c => c.phone.toLowerCase().includes(ref))
  return matches.length === 1 ? matches[0] : null
}

function matchByName(payment: Payment, customers: Customer[]): Customer | null {
  if (!payment.raw_narration) return null
  const narration = payment.raw_narration.toLowerCase()
  const matches = customers.filter(c => narration.includes(c.full_name.toLowerCase()))
  return matches.length === 1 ? matches[0] : null
}

// ---- Test data ----

const customers: Customer[] = [
  { id: "1", full_name: "John Doe", phone: "+254712345678", outstanding_balance: 5000 },
  { id: "2", full_name: "Jane Smith", phone: "+254723456789", outstanding_balance: 3000 },
  { id: "3", full_name: "Bob Johnson", phone: "0734567890", outstanding_balance: 1000 },
]

describe("Phone Normalisation", () => {
  it("normalises +254 prefix correctly", () => {
    expect(normalisePhone("+254712345678")).toBe("+254712345678")
  })

  it("normalises 254 prefix (no +)", () => {
    expect(normalisePhone("254712345678")).toBe("+254712345678")
  })

  it("normalises 07XX format", () => {
    expect(normalisePhone("0712345678")).toBe("+254712345678")
  })

  it("normalises 9-digit number", () => {
    expect(normalisePhone("712345678")).toBe("+254712345678")
  })

  it("strips spaces", () => {
    expect(normalisePhone("+254 712 345 678")).toBe("+254712345678")
  })

  it("handles already normalised number", () => {
    expect(normalisePhone("+254723456789")).toBe("+254723456789")
  })
})

describe("Phone Match", () => {
  it("matches customer by exact phone number", () => {
    const payment: Payment = { raw_phone: "+254712345678" }
    const match = matchByPhone(payment, customers)
    expect(match?.id).toBe("1")
  })

  it("matches customer with 07XX format phone", () => {
    const payment: Payment = { raw_phone: "0712345678" }
    const match = matchByPhone(payment, customers)
    expect(match?.id).toBe("1")
  })

  it("matches customer with 254 prefix (no +)", () => {
    const payment: Payment = { raw_phone: "254712345678" }
    const match = matchByPhone(payment, customers)
    expect(match?.id).toBe("1")
  })

  it("returns null when no phone match", () => {
    const payment: Payment = { raw_phone: "+254799999999" }
    const match = matchByPhone(payment, customers)
    expect(match).toBeNull()
  })

  it("returns null when multiple customers match same phone", () => {
    const duplicateCustomers: Customer[] = [
      { id: "1", full_name: "John Doe", phone: "+254712345678", outstanding_balance: 5000 },
      { id: "4", full_name: "John Doe Jr", phone: "+254712345678", outstanding_balance: 2000 },
    ]
    const payment: Payment = { raw_phone: "+254712345678" }
    const match = matchByPhone(payment, duplicateCustomers)
    expect(match).toBeNull()
  })

  it("returns null when raw_phone is null", () => {
    const payment: Payment = { raw_phone: null }
    const match = matchByPhone(payment, customers)
    expect(match).toBeNull()
  })
})

describe("Reference Match", () => {
  it("matches customer by phone in reference", () => {
    const payment: Payment = { raw_reference: "712345678" }
    const match = matchByReference(payment, customers)
    expect(match?.id).toBe("1")
  })

  it("returns null when no reference match", () => {
    const payment: Payment = { raw_reference: "UNKNOWN_REF" }
    const match = matchByReference(payment, customers)
    expect(match).toBeNull()
  })

  it("returns null when raw_reference is null", () => {
    const payment: Payment = { raw_reference: null }
    const match = matchByReference(payment, customers)
    expect(match).toBeNull()
  })
})

describe("Name Keyword Match", () => {
  it("matches customer by full name in narration", () => {
    const payment: Payment = { raw_narration: "Payment from John Doe for fuel" }
    const match = matchByName(payment, customers)
    expect(match?.id).toBe("1")
  })

  it("matches case-insensitively", () => {
    const payment: Payment = { raw_narration: "PAYMENT FROM JANE SMITH" }
    const match = matchByName(payment, customers)
    expect(match?.id).toBe("2")
  })

  it("returns null when no name match", () => {
    const payment: Payment = { raw_narration: "Unknown sender payment" }
    const match = matchByName(payment, customers)
    expect(match).toBeNull()
  })

  it("returns null when multiple names match", () => {
    const payment: Payment = { raw_narration: "John Doe and Jane Smith payment" }
    const match = matchByName(payment, customers)
    expect(match).toBeNull()
  })

  it("returns null when raw_narration is null", () => {
    const payment: Payment = { raw_narration: null }
    const match = matchByName(payment, customers)
    expect(match).toBeNull()
  })
})

describe("Priority Order", () => {
  it("phone match takes priority over reference match", () => {
    const payment: Payment = {
      raw_phone: "+254712345678",
      raw_reference: "723456789", // would match Jane Smith
    }
    const phoneMatch = matchByPhone(payment, customers)
    expect(phoneMatch?.id).toBe("1") // John Doe via phone
  })

  it("reference match takes priority over name match", () => {
    const payment: Payment = {
      raw_phone: null,
      raw_reference: "712345678", // matches John Doe
      raw_narration: "Payment from Jane Smith", // would match Jane Smith
    }
    const refMatch = matchByReference(payment, customers)
    expect(refMatch?.id).toBe("1") // John Doe via reference
  })
})
