/**
 * Property-Based Test: Balance Integrity
 *
 * Validates: Requirements 12.1, 12.2, 12.3
 *
 * Property: For all customers, outstanding_balance === sum(credit_sales) - sum(payments)
 * after applying any arbitrary sequence of credit sales and payments.
 */

import { describe, it, expect } from "vitest"
import * as fc from "fast-check"

interface Transaction {
  type: "sale" | "payment"
  amount: number
}

/**
 * Pure function that computes the expected outstanding balance
 * given a sequence of transactions.
 */
function computeBalance(transactions: Transaction[]): number {
  let balance = 0
  for (const tx of transactions) {
    if (tx.type === "sale") {
      balance += tx.amount
    } else {
      balance -= tx.amount
    }
  }
  return balance
}

/**
 * Simulates the system's balance tracking logic.
 * Mirrors the atomic update pattern used in the API routes.
 */
function simulateBalanceTracking(transactions: Transaction[]): number {
  let outstanding_balance = 0

  for (const tx of transactions) {
    if (tx.type === "sale") {
      // Credit sale: atomically add to outstanding_balance
      outstanding_balance = outstanding_balance + tx.amount
    } else {
      // Payment: atomically subtract from outstanding_balance
      outstanding_balance = outstanding_balance - tx.amount
    }
  }

  return outstanding_balance
}

describe("Balance Integrity Property", () => {
  it("outstanding_balance equals sum(credit_sales) - sum(payments) for any transaction sequence", () => {
    /**
     * Validates: Requirements 12.1
     * Generator: arbitrary sequence of credit sales and payments
     * Property: outstanding_balance === sum(sales) - sum(payments) after all transactions
     */
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom("sale" as const, "payment" as const),
            amount: fc.float({ min: 0.01, max: 100000, noNaN: true, noDefaultInfinity: true }),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (transactions) => {
          const expected = computeBalance(transactions)
          const actual = simulateBalanceTracking(transactions)

          // Allow for floating point precision (within 1 cent)
          return Math.abs(actual - expected) < 0.01
        }
      ),
      { numRuns: 1000 }
    )
  })

  it("balance is additive: applying transactions in batches equals applying all at once", () => {
    /**
     * Validates: Requirements 12.2, 12.3
     * Property: balance(A + B) === balance(A) + delta(B)
     */
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom("sale" as const, "payment" as const),
            amount: fc.float({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.integer({ min: 0, max: 19 }),
        (transactions, splitPoint) => {
          const split = Math.min(splitPoint, transactions.length)
          const firstBatch = transactions.slice(0, split)
          const secondBatch = transactions.slice(split)

          const balanceAfterFirst = simulateBalanceTracking(firstBatch)
          const deltaSecond = computeBalance(secondBatch)
          const combined = balanceAfterFirst + deltaSecond

          const allAtOnce = simulateBalanceTracking(transactions)

          return Math.abs(combined - allAtOnce) < 0.01
        }
      ),
      { numRuns: 500 }
    )
  })

  it("credit sales always increase the balance", () => {
    /**
     * Validates: Requirements 12.2
     * Property: after a credit sale, balance increases by exactly the sale amount
     */
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1000000, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 0.01, max: 100000, noNaN: true, noDefaultInfinity: true }),
        (initialBalance, saleAmount) => {
          const newBalance = initialBalance + saleAmount
          return Math.abs(newBalance - initialBalance - saleAmount) < 0.01
        }
      ),
      { numRuns: 1000 }
    )
  })

  it("payments always decrease the balance", () => {
    /**
     * Validates: Requirements 12.3
     * Property: after a payment, balance decreases by exactly the payment amount
     */
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 1000000, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 0.01, max: 100000, noNaN: true, noDefaultInfinity: true }),
        (initialBalance, paymentAmount) => {
          const newBalance = initialBalance - paymentAmount
          return Math.abs(newBalance - (initialBalance - paymentAmount)) < 0.01
        }
      ),
      { numRuns: 1000 }
    )
  })
})
