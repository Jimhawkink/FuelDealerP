import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  consumer_key: z.string().min(1),
  consumer_secret: z.string().min(1),
  paybill_number: z.string().min(1),
  passkey: z.string().min(1),
  callback_url: z.string().url(),
})

export async function POST(req: NextRequest) {
  try {
    await requireRole("dealer_admin")
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 })
    const supabase = await createClient()
    // Store non-secret settings in fuel_settings
    await supabase.from("fuel_settings").upsert([
      { key: "mpesa_paybill_number", value: parsed.data.paybill_number },
      { key: "mpesa_callback_url", value: parsed.data.callback_url },
    ], { onConflict: "key" })
    // Note: consumer_key, consumer_secret, passkey should be stored in Supabase Vault
    // via the Supabase dashboard or CLI - not via API for security
    return NextResponse.json({ success: true, message: "M-Pesa config saved. Store Consumer Key/Secret/Passkey in Supabase Vault." })
  } catch (err) {
    if (err instanceof Response) return new NextResponse(await err.text(), { status: err.status })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
