import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const StkPushSchema = z.object({
  customer_id: z.string().uuid(),
  amount: z.number().positive(),
  phone: z.string().min(9).max(20),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("accountant")
    const body = await req.json()
    const parsed = StkPushSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase.functions.invoke("mpesa-stk-push", {
      body: {
        ...parsed.data,
        initiated_by: user.id,
      },
    })

    if (error) {
      return NextResponse.json({ error: "STK Push failed", details: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.text()
      return new NextResponse(body, { status: err.status, headers: { "Content-Type": "application/json" } })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
