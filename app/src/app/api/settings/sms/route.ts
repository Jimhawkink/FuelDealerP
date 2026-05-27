import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  provider: z.enum(["africas_talking", "twilio"]),
}).passthrough()

export async function POST(req: NextRequest) {
  try {
    await requireRole("dealer_admin")
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 })
    const supabase = await createClient()
    await supabase.from("fuel_settings").upsert([
      { key: "sms_provider", value: parsed.data.provider },
    ], { onConflict: "key" })
    return NextResponse.json({ success: true, message: "SMS provider saved. Store API credentials in Supabase Vault." })
  } catch (err) {
    if (err instanceof Response) return new NextResponse(await err.text(), { status: err.status })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
