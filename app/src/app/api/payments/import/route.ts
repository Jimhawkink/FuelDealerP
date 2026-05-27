import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("accountant")
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
    const supabase = await createClient()
    // Record the import attempt
    const { data: importRecord } = await supabase.from("fuel_bank_imports").insert({
      filename: file.name, sha256_hash: `manual-${Date.now()}`,
      bank_name: "manual", total_rows: 0, parsed_rows: 0, error_rows: 0,
      imported_by: user.id,
    }).select().single()
    // In production, call the import-bank-statement Edge Function
    return NextResponse.json({ success: true, import_id: importRecord?.id, total_rows: 0, parsed_rows: 0, error_rows: 0, message: "File received. Connect import-bank-statement Edge Function for full parsing." })
  } catch (err) {
    if (err instanceof Response) return new NextResponse(await err.text(), { status: err.status })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
