/**
 * Unit Tests: Bank Format Detection
 *
 * Tests the header fingerprinting logic for all 8 supported banks.
 * Mirrors the detectBank() function in import-bank-statement/index.ts.
 */

import { describe, it, expect } from "vitest"

// ---- Bank format detection (mirrors import-bank-statement/index.ts) ----

function detectBank(headers: string[]): string | null {
  const h = headers.map(s => s.toLowerCase().trim())
  const has = (keyword: string) => h.some(col => col.includes(keyword.toLowerCase()))

  if (has("value date") && has("credit amount")) return "KCB"
  if (has("booking date")) return "Standard Chartered"
  if (has("trans date") && has("particulars")) return "Co-op"
  if (has("running balance") && has("narration")) return "NCBA"
  if (has("transaction details") && has("debit amount")) return "Absa"
  if (has("withdrawals") && has("deposits")) return "Family Bank"
  if (has("narration") && has("debit") && has("credit") && has("balance")) return "DTB"
  if (has("dr") && has("cr") && has("balance")) return "Equity"
  return null
}

describe("Bank Format Detection", () => {
  describe("KCB", () => {
    it("detects KCB by 'Value Date' and 'Credit Amount' headers", () => {
      const headers = ["Value Date", "Transaction Reference", "Debit Amount", "Credit Amount", "Balance"]
      expect(detectBank(headers)).toBe("KCB")
    })

    it("detects KCB case-insensitively", () => {
      const headers = ["value date", "credit amount", "debit amount"]
      expect(detectBank(headers)).toBe("KCB")
    })
  })

  describe("Equity", () => {
    it("detects Equity by 'Dr', 'Cr', 'Balance' headers", () => {
      const headers = ["Date", "Description", "Dr", "Cr", "Balance"]
      expect(detectBank(headers)).toBe("Equity")
    })

    it("detects Equity case-insensitively", () => {
      const headers = ["date", "description", "dr", "cr", "balance"]
      expect(detectBank(headers)).toBe("Equity")
    })
  })

  describe("Co-op", () => {
    it("detects Co-op by 'Trans Date' and 'Particulars' headers", () => {
      const headers = ["Trans Date", "Particulars", "Debit", "Credit", "Balance"]
      expect(detectBank(headers)).toBe("Co-op")
    })

    it("detects Co-op case-insensitively", () => {
      const headers = ["trans date", "particulars", "debit", "credit"]
      expect(detectBank(headers)).toBe("Co-op")
    })
  })

  describe("NCBA", () => {
    it("detects NCBA by 'Narration' and 'Running Balance' headers", () => {
      const headers = ["Transaction Date", "Narration", "Debit", "Credit", "Running Balance"]
      expect(detectBank(headers)).toBe("NCBA")
    })

    it("detects NCBA case-insensitively", () => {
      const headers = ["transaction date", "narration", "debit", "credit", "running balance"]
      expect(detectBank(headers)).toBe("NCBA")
    })
  })

  describe("Absa", () => {
    it("detects Absa by 'Transaction Details' and 'Debit Amount' headers", () => {
      const headers = ["Date", "Transaction Details", "Debit Amount", "Credit Amount", "Balance"]
      expect(detectBank(headers)).toBe("Absa")
    })

    it("detects Absa case-insensitively", () => {
      const headers = ["date", "transaction details", "debit amount", "credit amount"]
      expect(detectBank(headers)).toBe("Absa")
    })
  })

  describe("Standard Chartered", () => {
    it("detects Standard Chartered by 'Booking Date' header", () => {
      const headers = ["Booking Date", "Description", "Debit", "Credit", "Balance"]
      expect(detectBank(headers)).toBe("Standard Chartered")
    })

    it("detects Standard Chartered case-insensitively", () => {
      const headers = ["booking date", "description", "debit", "credit"]
      expect(detectBank(headers)).toBe("Standard Chartered")
    })
  })

  describe("DTB", () => {
    it("detects DTB by 'Narration', 'Debit', 'Credit', 'Balance' headers", () => {
      const headers = ["Date", "Narration", "Debit", "Credit", "Balance"]
      expect(detectBank(headers)).toBe("DTB")
    })

    it("detects DTB case-insensitively", () => {
      const headers = ["date", "narration", "debit", "credit", "balance"]
      expect(detectBank(headers)).toBe("DTB")
    })
  })

  describe("Family Bank", () => {
    it("detects Family Bank by 'Withdrawals' and 'Deposits' headers", () => {
      const headers = ["Date", "Description", "Withdrawals", "Deposits", "Balance"]
      expect(detectBank(headers)).toBe("Family Bank")
    })

    it("detects Family Bank case-insensitively", () => {
      const headers = ["date", "description", "withdrawals", "deposits", "balance"]
      expect(detectBank(headers)).toBe("Family Bank")
    })
  })

  describe("Unknown formats", () => {
    it("returns null for unknown bank format", () => {
      const headers = ["Date", "Amount", "Description"]
      expect(detectBank(headers)).toBeNull()
    })

    it("returns null for empty headers", () => {
      expect(detectBank([])).toBeNull()
    })

    it("returns null for unrecognised column names", () => {
      const headers = ["Transaction_Date", "Amount_In", "Amount_Out", "Ref_No"]
      expect(detectBank(headers)).toBeNull()
    })
  })

  describe("Priority order", () => {
    it("KCB takes priority when both 'value date' and 'credit amount' are present", () => {
      // KCB check comes first in the detection logic
      const headers = ["Value Date", "Credit Amount", "Debit Amount", "Balance"]
      expect(detectBank(headers)).toBe("KCB")
    })

    it("Standard Chartered detected before DTB when 'booking date' present", () => {
      const headers = ["Booking Date", "Narration", "Debit", "Credit", "Balance"]
      // Standard Chartered check comes before DTB
      expect(detectBank(headers)).toBe("Standard Chartered")
    })
  })
})
