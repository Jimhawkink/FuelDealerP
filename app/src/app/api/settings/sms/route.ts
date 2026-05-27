import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const SmsSettingsSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("africas_talking"),
    api_key: z.string().min(1),
    username: z.string().min(1),
    sender_id: z.string().optional(),
  }),
  z.object({
    provider: z.literal("twilio"),
    account_sid: z.string().min(1),
    auth_token: z.string().min(1),
    from_number: z.string().min(1),
  }),
])

export async function POST(req: NextRequest) {
  try {
    await requireRole("dealer_admin")
    const body = await req.json()
    const parsed = SmsSettingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = await createClient()

    // Save provider setting
    await supabase
      .from("fuel_settings")
      .upsert({ key: "sms_provider", value: parsed.data.provider }, { onConflict: "key" })

    // Save provider-specific credentials
    if (parsed.data.provider === "africas_talking") {
      const settings = [
        { key: "at_api_key", value: parsed.data.api_key },
        { key: "at_username", value: parsed.data.username },
        { key: "at_sender_id", value: parsed.data.sender_id ?? "AlphaFuel" },
      ]
      for (const s of settings) {
        await supabase.from("fuel_settings").upsert({ key: s.key, value: s.value }, { onConflict: "key" })
      }
    } else {
      const settings = [
        { key: "twilio_account_sid", value: parsed.data.account_sid },
        { key: "twilio_auth_token", value: parsed.data.auth_token },
        { key: "twilio_from_number", value: parsed.data.from_number },
      ]
      for (const s of settings) {
        await supabase.from("fuel_settings").upsert({ key: s.key, value: s.value }, { onConflict: "key" })
      }
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
