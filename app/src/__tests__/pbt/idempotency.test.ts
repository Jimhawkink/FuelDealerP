/**
 * Property-Based Test: Idempotency
 *
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4
 *
 * Property: posting the same idempotency_key N times results in exactly 1 payment record.
 */

import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

interface Payment {
  idempotency_key: string
  amount: number
  channel: string
}

/**
 * Simulates the idempotency enforcement logic used in the system.
 * Mirrors the UNIQUE constraint on fuel_payments.idempotency_key.
 */
class PaymentStore {
  private payments: Map<string, Payment> = new Map()

  /**
   * Attempts to post a payment. Returns true if inserted, false if duplicate.
   * Mirrors the DB UNIQUE constraint behavior.
   */
  postPayment(payment: Payment): boolean {
    if (this.payments.has(payment.idempotency_key)) {
      // Duplicate - discard silently (idempotent)
      return false
    }
    this.payments.set(payment.idempotency_key, payment)
    return true
  }

  countByKey(key: string): number {
    return this.payments.has(key) ? 1 : 0
  }

  totalCount(): number {
    return this.payments.size
  }
}

describe("Idempotency Property", () => {
  it("posting same idempotency_key N times results in exactly 1 payment record", () => {
    /**
     * Validates: Requirements 13.2, 13.3
     * Generator: arbitrary payment + duplicate count 1-10
     * Property: posting same idempotency_key N times = exactly 1 payment record
     */
    fc.assert(
      fc.property(
        fc.record({
          idempotency_key: fc.string({ minLength: 1, maxLength: 100 }),
          amount: fc.float({ min: 0.01, max: 1000000, noNaN: true, noDefaultInfinity: true }),
          channel: fc.constantFrom("cash", "mpesa_paybill", "mpesa_stk", "bank_deposit"),
        }),
        fc.integer({ min: 1, max: 10 }),
        (payment, duplicateCount) => {
          const store = new PaymentStore()

          // Post the same payment N times
          for (let i = 0; i < duplicateCount; i++) {
            store.postPayment(payment)
          }

          // Exactly 1 record should exist regardless of how many times it was posted
          return store.countByKey(payment.idempotency_key) === 1
        }
      ),
      { numRuns: 1000 }
    )
  })

  it("different idempotency keys result in separate payment records", () => {
    /**
     * Validates: Requirements 13.1
     * Property: N distinct keys = N payment records
     */
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.string({ minLength: 1, maxLength: 50 }),
          { minLength: 1, maxLength: 20 }
        ),
        (keys) => {
          const store = new PaymentStore()

          for (const key of keys) {
            store.postPayment({
              idempotency_key: key,
              amount: 100,
              channel: "cash",
            })
          }

          return store.totalCount() === keys.length
        }
      ),
      { numRuns: 500 }
    )
  })

  it("mixed unique and duplicate keys: only unique keys are stored", () => {
    /**
     * Validates: Requirements 13.3
     * Property: posting a mix of unique and duplicate keys stores only unique ones
     */
    fc.assert(
      fc.property(
        fc.array(
          fc.string({ minLength: 1, maxLength: 30 }),
          { minLength: 1, maxLength: 30 }
        ),
        (keys) => {
          const store = new PaymentStore()
          const uniqueKeys = new Set(keys)

          for (const key of keys) {
            store.postPayment({ idempotency_key: key, amount: 50, channel: "cash" })
          }

          // Total stored should equal number of unique keys
          return store.totalCount() === uniqueKeys.size
        }
      ),
      { numRuns: 500 }
    )
  })

  it("idempotency key format: c2b:{TransID} is unique per transaction", () => {
    /**
     * Validates: Requirements 13.1
     * Property: c2b: prefixed keys from different TransIDs are always distinct
     */
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.string({ minLength: 1, maxLength: 20 }),
          { minLength: 2, maxLength: 10 }
        ),
        (transIds) => {
          const keys = transIds.map(id => `c2b:${id}`)
          const uniqueKeys = new Set(keys)
          return uniqueKeys.size === transIds.length
        }
      ),
      { numRuns: 500 }
    )
  })
})
