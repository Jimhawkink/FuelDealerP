import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const ReminderSchema = z.object({
  customer_ids: z.array(z.string().uuid()).min(1),
})

export async function POST(req: NextRequest) {
  try {
    await requireRole("dealer_admin")
    const body = await req.json()
    const parsed = ReminderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
    }

    const { customer_ids } = parsed.data
    const supabase = await createClient()

    // Fetch customers
    const { data: customers, error } = await supabase
      .from("fuel_customers")
      .select("id, full_name, phone, outstanding_balance")
      .in("id", customer_ids)
      .eq("is_active", true)

    if (error || !customers) {
      return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
    }

    const results = await Promise.allSettled(
      customers.map(async (customer) => {
        const message = `Dear ${customer.full_name}, your outstanding balance with Alpha Fuel is KES ${Number(customer.outstanding_balance).toLocaleString("en-KE", { minimumFractionDigits: 2 })}. Please make payment at your earliest convenience. Thank you.`

        const { error: smsError } = await supabase.functions.invoke("send-sms", {
          body: {
            customer_id: customer.id,
            phone: customer.phone,
            message,
          },
        })

        return { customer_id: customer.id, success: !smsError }
      })
    )

    const sent = results.filter(r => r.status === "fulfilled").length
    const failed = results.filter(r => r.status === "rejected").length

    return NextResponse.json({ success: true, sent, failed })
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.text()
      return new NextResponse(body, { status: err.status, headers: { "Content-Type": "application/json" } })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
