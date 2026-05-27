export interface BankTransaction {
  transactionDate: Date
  creditAmount: number
  debitAmount: number
  reference: string
  narration: string
}

/**
 * Formats a list of BankTransaction objects into a canonical CSV string.
 * Header: date,credit_amount,debit_amount,reference,narration
 * Dates: ISO 8601 (YYYY-MM-DD)
 * Numbers: toFixed(2)
 * Strings: CSV-escaped (double-quoted if contains comma, newline, or double-quote)
 */
export function prettyPrint(transactions: BankTransaction[]): string {
  const header = "date,credit_amount,debit_amount,reference,narration"
  const rows = transactions.map(t => {
    const date = t.transactionDate.toISOString().split("T")[0]
    const credit = t.creditAmount.toFixed(2)
    const debit = t.debitAmount.toFixed(2)
    const reference = csvEscape(t.reference)
    const narration = csvEscape(t.narration)
    return `${date},${credit},${debit},${reference},${narration}`
  })
  return [header, ...rows].join("\n")
}

/**
 * Parses a CSV string produced by prettyPrint back into BankTransaction objects.
 * Round-trip property: parsePrettyPrinted(prettyPrint(T)) deep-equals T
 */
export function parsePrettyPrinted(csv: string): BankTransaction[] {
  const lines = csv.split("\n")
  if (lines.length < 2) return []

  // Skip header
  const dataLines = lines.slice(1).filter(l => l.trim() !== "")

  return dataLines.map(line => {
    const [dateStr, creditStr, debitStr, ...rest] = parseCsvLine(line)

    // Re-join reference and narration (they may have been split by commas inside quotes)
    // parseCsvLine handles this correctly, so rest[0] = reference, rest[1] = narration
    const reference = rest[0] ?? ""
    const narration = rest[1] ?? ""

    // Parse ISO date - use noon UTC to avoid timezone issues
    const transactionDate = new Date(`${dateStr}T12:00:00.000Z`)

    return {
      transactionDate,
      creditAmount: parseFloat(creditStr) || 0,
      debitAmount: parseFloat(debitStr) || 0,
      reference,
      narration,
    }
  })
}

/**
 * CSV-escapes a string value.
 * Wraps in double quotes if the value contains a comma, newline, or double-quote.
 * Doubles any internal double-quotes.
 */
function csvEscape(value: string): string {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Parses a single CSV line respecting quoted fields.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const ch = line[i]

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Escaped double-quote
          current += '"'
          i += 2
        } else {
          // End of quoted field
          inQuotes = false
          i++
        }
      } else {
        current += ch
        i++
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
      } else if (ch === ",") {
        fields.push(current)
        current = ""
        i++
      } else {
        current += ch
        i++
      }
    }
  }

  fields.push(current)
  return fields
}
