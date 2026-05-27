/**
 * Property-Based Test: Bank Statement Round-Trip
 *
 * Validates: Requirements 6.7, 6.8
 *
 * Property: parse(prettyPrint(transactions)) deep-equals transactions
 * for all valid BankTransaction lists.
 */

import { describe, it, expect } from "vitest"
import * as fc from "fast-check"
import { prettyPrint, parsePrettyPrinted, BankTransaction } from "@/lib/bank-parser/pretty-printer"

/**
 * Arbitrary generator for BankTransaction objects.
 * Constrains to valid input space:
 * - Dates: 2020-01-01 to 2030-12-31
 * - Amounts: non-negative, finite, max 2 decimal places after toFixed(2)
 * - Strings: printable ASCII (no control chars that would break CSV)
 */
const bankTransactionArb = fc.record({
  transactionDate: fc.date({
    min: new Date("2020-01-01T12:00:00.000Z"),
    max: new Date("2030-12-31T12:00:00.000Z"),
  }),
  creditAmount: fc.float({ min: 0, max: 10_000_000, noNaN: true, noDefaultInfinity: true }),
  debitAmount: fc.float({ min: 0, max: 10_000_000, noNaN: true, noDefaultInfinity: true }),
  reference: fc.string({ minLength: 0, maxLength: 50 }).filter(s => !s.includes("\r")),
  narration: fc.string({ minLength: 0, maxLength: 100 }).filter(s => !s.includes("\r")),
})

/**
 * Normalises a BankTransaction for comparison.
 * Accounts for the precision loss from toFixed(2) and ISO date formatting.
 */
function normalise(tx: BankTransaction): {
  date: string
  creditAmount: number
  debitAmount: number
  reference: string
  narration: string
} {
  return {
    date: tx.transactionDate.toISOString().split("T")[0],
    creditAmount: parseFloat(tx.creditAmount.toFixed(2)),
    debitAmount: parseFloat(tx.debitAmount.toFixed(2)),
    reference: tx.reference,
    narration: tx.narration,
  }
}

describe("Bank Statement Round-Trip Property", () => {
  it("parse(prettyPrint(transactions)) deep-equals transactions for any valid input", () => {
    /**
     * Validates: Requirements 6.8
     * Generator: arbitrary list of BankTransaction objects
     * Property: parse(prettyPrint(T)) deep-equals T (after normalisation for precision)
     */
    fc.assert(
      fc.property(
        fc.array(bankTransactionArb, { minLength: 0, maxLength: 50 }),
        (transactions) => {
          const csv = prettyPrint(transactions)
          const parsed = parsePrettyPrinted(csv)

          if (parsed.length !== transactions.length) return false

          for (let i = 0; i < transactions.length; i++) {
            const original = normalise(transactions[i])
            const roundTripped = normalise(parsed[i])

            if (original.date !== roundTripped.date) return false
            if (Math.abs(original.creditAmount - roundTripped.creditAmount) > 0.001) return false
            if (Math.abs(original.debitAmount - roundTripped.debitAmount) > 0.001) return false
            if (original.reference !== roundTripped.reference) return false
            if (original.narration !== roundTripped.narration) return false
          }

          return true
        }
      ),
      { numRuns: 500 }
    )
  })

  it("prettyPrint produces valid CSV with correct header", () => {
    /**
     * Validates: Requirements 6.7
     * Property: output always starts with the canonical header line
     */
    fc.assert(
      fc.property(
        fc.array(bankTransactionArb, { minLength: 0, maxLength: 10 }),
        (transactions) => {
          const csv = prettyPrint(transactions)
          const firstLine = csv.split("\n")[0]
          return firstLine === "date,credit_amount,debit_amount,reference,narration"
        }
      ),
      { numRuns: 200 }
    )
  })

  it("prettyPrint row count equals transaction count + 1 (header)", () => {
    /**
     * Validates: Requirements 6.7
     * Property: number of lines = transactions.length + 1
     */
    fc.assert(
      fc.property(
        fc.array(bankTransactionArb, { minLength: 0, maxLength: 20 }),
        (transactions) => {
          const csv = prettyPrint(transactions)
          const lines = csv.split("\n").filter(l => l.trim() !== "")
          return lines.length === transactions.length + 1
        }
      ),
      { numRuns: 200 }
    )
  })

  it("empty transaction list produces only header", () => {
    const csv = prettyPrint([])
    expect(csv).toBe("date,credit_amount,debit_amount,reference,narration")
    const parsed = parsePrettyPrinted(csv)
    expect(parsed).toHaveLength(0)
  })

  it("strings with commas are correctly escaped and round-trip", () => {
    const tx: BankTransaction = {
      transactionDate: new Date("2024-06-15T12:00:00.000Z"),
      creditAmount: 1500.50,
      debitAmount: 0,
      reference: "REF,123",
      narration: 'Payment for "fuel", June 2024',
    }
    const csv = prettyPrint([tx])
    const parsed = parsePrettyPrinted(csv)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].reference).toBe(tx.reference)
    expect(parsed[0].narration).toBe(tx.narration)
    expect(parseFloat(parsed[0].creditAmount.toFixed(2))).toBeCloseTo(tx.creditAmount, 2)
  })

  it("dates are formatted as ISO 8601 YYYY-MM-DD", () => {
    const tx: BankTransaction = {
      transactionDate: new Date("2024-03-15T12:00:00.000Z"),
      creditAmount: 500,
      debitAmount: 0,
      reference: "TEST",
      narration: "Test",
    }
    const csv = prettyPrint([tx])
    const lines = csv.split("\n")
    expect(lines[1]).toMatch(/^2024-03-15,/)
  })
})
