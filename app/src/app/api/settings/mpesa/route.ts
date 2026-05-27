import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const MpesaSettingsSchema = z.object({
  consumer_key: z.string().min(1),
  consumer_secret: z.string().min(1),
  paybill_number: z.string().min(1),
  passkey: z.string().min(1),
  callback_url: z.string().url().optional(),
  environment: z.enum(["sandbox", "production"]).default("sandbox"),
})

export async function POST(req: NextRequest) {
  try {
    await requireRole("dealer_admin")
    const body = await req.json()
    const parsed = MpesaSettingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = await createClient()

    // Store settings (in production, these would go to Supabase Vault)
    const settings = [
      { key: "mpesa_consumer_key", value: parsed.data.consumer_key },
      { key: "mpesa_consumer_secret", value: parsed.data.consumer_secret },
      { key: "mpesa_paybill_number", value: parsed.data.paybill_number },
      { key: "mpesa_passkey", value: parsed.data.passkey },
      { key: "mpesa_environment", value: parsed.data.environment },
    ]

    if (parsed.data.callback_url) {
      settings.push({ key: "mpesa_callback_url", value: parsed.data.callback_url })
    }

    for (const setting of settings) {
      await supabase
        .from("fuel_settings")
        .upsert({ key: setting.key, value: setting.value }, { onConflict: "key" })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.text()
      return new NextResponse(body, { status: err.status, headers: { "Content-Type": "application/json" } })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
