import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({ customer_id: z.string().uuid(), amount: z.number().positive() })

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("accountant")
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 })
    const supabase = await createClient()
    const { data: customer } = await supabase.from("fuel_customers").select("phone, full_name").eq("id", parsed.data.customer_id).single()
    if (!customer?.phone) return NextResponse.json({ error: "Customer has no phone number" }, { status: 400 })
    // In production, call the mpesa-stk-push Edge Function via supabase.functions.invoke
    // For now, create a pending STK push request record
    const { data: stkReq, error } = await supabase.from("fuel_stk_push_requests").insert({
      customer_id: parsed.data.customer_id, amount: parsed.data.amount,
      phone: customer.phone, status: "pending", initiated_by: user.id,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, checkoutRequestId: stkReq.id, message: `STK Push initiated to ${customer.phone}` })
  } catch (err) {
    if (err instanceof Response) return new NextResponse(await err.text(), { status: err.status })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
