import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
// @ts-ignore
import Papa from "https://esm.sh/papaparse@5"
// @ts-ignore
import * as XLSX from "https://esm.sh/xlsx@0.18.5"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface BankTransaction {
  transactionDate: Date
  creditAmount: number
  debitAmount: number
  reference: string
  narration: string
}

interface ParseError {
  row: number
  reason: string
}

// Bank format detection by header fingerprinting
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

// Bank-specific column mappers
function mapRow(bank: string, row: Record<string, string>): BankTransaction | null {
  try {
    const get = (keys: string[]): string => {
      for (const key of keys) {
        const found = Object.keys(row).find(k => k.toLowerCase().trim().includes(key.toLowerCase()))
        if (found && row[found]?.trim()) return row[found].trim()
      }
      return ""
    }

    const parseAmount = (val: string): number => {
      if (!val) return 0
      return parseFloat(val.replace(/[^0-9.-]/g, "")) || 0
    }

    const parseDate = (val: string): Date | null => {
      if (!val) return null
      // Try various date formats
      const cleaned = val.trim()
      const d = new Date(cleaned)
      if (!isNaN(d.getTime())) return d
      // DD/MM/YYYY
      const parts = cleaned.split(/[\/\-\.]/)
      if (parts.length === 3) {
        const [a, b, c] = parts
        if (a.length <= 2 && b.length <= 2 && c.length === 4) {
          return new Date(`${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`)
        }
      }
      return null
    }

    let dateStr = ""
    let credit = 0
    let debit = 0
    let reference = ""
    let narration = ""

    switch (bank) {
      case "KCB":
        dateStr = get(["value date", "date"])
        credit = parseAmount(get(["credit amount", "credit"]))
        debit = parseAmount(get(["debit amount", "debit"]))
        reference = get(["transaction reference", "reference", "ref"])
        narration = get(["description", "narration", "particulars"])
        break
      case "Equity":
        dateStr = get(["date"])
        credit = parseAmount(get(["cr", "credit"]))
        debit = parseAmount(get(["dr", "debit"]))
        reference = get(["reference", "ref"])
        narration = get(["description", "narration"])
        break
      case "Co-op":
        dateStr = get(["trans date", "date"])
        credit = parseAmount(get(["credit", "cr"]))
        debit = parseAmount(get(["debit", "dr"]))
        reference = get(["reference", "ref"])
        narration = get(["particulars", "description", "narration"])
        break
      case "NCBA":
        dateStr = get(["transaction date", "date"])
        credit = parseAmount(get(["credit", "cr"]))
        debit = parseAmount(get(["debit", "dr"]))
        reference = get(["reference", "ref"])
        narration = get(["narration", "description"])
        break
      case "Absa":
        dateStr = get(["date"])
        credit = parseAmount(get(["credit amount", "credit"]))
        debit = parseAmount(get(["debit amount", "debit"]))
        reference = get(["reference", "ref"])
        narration = get(["transaction details", "description", "narration"])
        break
      case "Standard Chartered":
        dateStr = get(["booking date", "date"])
        credit = parseAmount(get(["credit", "cr"]))
        debit = parseAmount(get(["debit", "dr"]))
        reference = get(["reference", "ref"])
        narration = get(["description", "narration"])
        break
      case "DTB":
        dateStr = get(["date"])
        credit = parseAmount(get(["credit", "cr"]))
        debit = parseAmount(get(["debit", "dr"]))
        reference = get(["reference", "ref"])
        narration = get(["narration", "description"])
        break
      case "Family Bank":
        dateStr = get(["date"])
        credit = parseAmount(get(["deposits", "credit"]))
        debit = parseAmount(get(["withdrawals", "debit"]))
        reference = get(["reference", "ref"])
        narration = get(["description", "narration"])
        break
      default:
        return null
    }

    const transactionDate = parseDate(dateStr)
    if (!transactionDate) return null

    return { transactionDate, creditAmount: credit, debitAmount: debit, reference, narration }
  } catch {
    return null
  }
}

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const bankNameOverride = formData.get("bank_name") as string | null
    const importedBy = formData.get("imported_by") as string | null

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const buffer = await file.arrayBuffer()
    const hash = await sha256(buffer)

    // Check for duplicate import
    const { data: existing } = await supabase
      .from("fuel_bank_imports")
      .select("id, created_at, imported_by")
      .eq("sha256_hash", hash)
      .single()

    if (existing) {
      return new Response(
        JSON.stringify({
          error: "Duplicate import",
          message: `This file was already imported on ${new Date(existing.created_at).toLocaleDateString()}`,
          original_import_id: existing.id,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Parse file
    let rows: Record<string, string>[] = []
    const filename = file.name.toLowerCase()

    if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
      const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json(sheet, { defval: "" })
    } else {
      const text = new TextDecoder().decode(buffer)
      const result = Papa.parse(text, { header: true, skipEmptyLines: true })
      rows = result.data as Record<string, string>[]
    }

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No data rows found in file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Detect bank
    const headers = Object.keys(rows[0])
    const detectedBank = bankNameOverride || detectBank(headers)

    if (!detectedBank) {
      return new Response(
        JSON.stringify({
          error: "Unknown bank format",
          message: "Could not detect bank format. Please select the bank manually.",
          headers,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Parse transactions
    const transactions: BankTransaction[] = []
    const parseErrors: ParseError[] = []

    rows.forEach((row, index) => {
      const tx = mapRow(detectedBank, row)
      if (tx) {
        transactions.push(tx)
      } else {
        parseErrors.push({ row: index + 2, reason: "Could not parse row" })
      }
    })

    // Insert bank import record
    const { data: importRecord, error: importError } = await supabase
      .from("fuel_bank_imports")
      .insert({
        filename: file.name,
        sha256_hash: hash,
        bank_name: detectedBank,
        total_rows: rows.length,
        parsed_rows: transactions.length,
        error_rows: parseErrors.length,
        imported_by: importedBy ?? null,
      })
      .select()
      .single()

    if (importError || !importRecord) {
      return new Response(
        JSON.stringify({ error: "Failed to create import record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Insert bank transactions and create payments for credits
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i]

      const { data: bankTx } = await supabase
        .from("fuel_bank_transactions")
        .insert({
          import_id: importRecord.id,
          transaction_date: tx.transactionDate.toISOString().split("T")[0],
          credit_amount: tx.creditAmount,
          debit_amount: tx.debitAmount,
          reference: tx.reference || null,
          narration: tx.narration || null,
        })
        .select()
        .single()

      // Create payment for credit rows
      if (tx.creditAmount > 0) {
        const idempotency_key = `bank:${importRecord.id}:${i}:${tx.reference || i}`

        const { data: payment } = await supabase
          .from("fuel_payments")
          .insert({
            amount: tx.creditAmount,
            channel: "bank_deposit",
            idempotency_key,
            status: "pending",
            raw_reference: tx.reference || null,
            raw_narration: tx.narration || null,
          })
          .select()
          .single()

        if (payment) {
          // Link payment to bank transaction
          if (bankTx) {
            await supabase
              .from("fuel_bank_transactions")
              .update({ payment_id: payment.id })
              .eq("id", bankTx.id)
          }

          // Call reconcile-payment
          supabase.functions.invoke("reconcile-payment", {
            body: { payment_id: payment.id },
          }).catch(console.error)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        import_id: importRecord.id,
        bank_name: detectedBank,
        total_rows: rows.length,
        parsed_rows: transactions.length,
        error_rows: parseErrors.length,
        parse_errors: parseErrors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("Import error:", err)
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
