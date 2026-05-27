import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({ payment_id: z.string().uuid(), customer_id: z.string().uuid() })

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("accountant")
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 })
    const { payment_id, customer_id } = parsed.data
    const supabase = await createClient()

    const { data: payment } = await supabase.from("fuel_payments").select("amount, status").eq("id", payment_id).single()
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    if (payment.status === "reconciled") return NextResponse.json({ error: "Payment already reconciled" }, { status: 400 })

    await supabase.from("fuel_payments").update({ customer_id, status: "reconciled", reconciled_by: user.id, reconciled_at: new Date().toISOString() }).eq("id", payment_id)
    const { data: cust } = await supabase.from("fuel_customers").select("outstanding_balance").eq("id", customer_id).single()
    await supabase.from("fuel_customers").update({ outstanding_balance: Math.max(0, (cust?.outstanding_balance ?? 0) - payment.amount) }).eq("id", customer_id)

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Response) return new NextResponse(await err.text(), { status: err.status })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
