import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({ customer_ids: z.array(z.string().uuid()).min(1) })

export async function POST(req: NextRequest) {
  try {
    await requireRole("dealer_admin")
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 })
    const supabase = await createClient()
    const { data: customers } = await supabase.from("fuel_customers").select("id, full_name, phone, outstanding_balance").in("id", parsed.data.customer_ids)
    const results = []
    for (const customer of customers ?? []) {
      if (!customer.phone) continue
      const message = `Dear ${customer.full_name}, your outstanding balance is KES ${Number(customer.outstanding_balance).toLocaleString()}. Please make payment at your earliest convenience. Thank you.`
      await supabase.from("fuel_sms_log").insert({ customer_id: customer.id, phone: customer.phone, message, provider: "africas_talking", status: "sent" })
      results.push({ customer_id: customer.id, status: "queued" })
    }
    return NextResponse.json({ success: true, results })
  } catch (err) {
    if (err instanceof Response) return new NextResponse(await err.text(), { status: err.status })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
