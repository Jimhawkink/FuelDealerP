import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface SmsResult {
  success: boolean
  messageId?: string
  error?: string
}

interface SmsProvider {
  sendSms(to: string, message: string): Promise<SmsResult>
}

class AfricasTalkingProvider implements SmsProvider {
  constructor(
    private apiKey: string,
    private username: string,
    private senderId: string
  ) {}

  async sendSms(to: string, message: string): Promise<SmsResult> {
    const params = new URLSearchParams({
      username: this.username,
      to,
      message,
      from: this.senderId,
    })

    const res = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        apiKey: this.apiKey,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    })

    const data = await res.json()

    if (!res.ok || data.SMSMessageData?.Recipients?.[0]?.status !== "Success") {
      return {
        success: false,
        error: data.SMSMessageData?.Recipients?.[0]?.status ?? "Unknown error",
      }
    }

    return {
      success: true,
      messageId: data.SMSMessageData?.Recipients?.[0]?.messageId,
    }
  }
}

class TwilioProvider implements SmsProvider {
  constructor(
    private accountSid: string,
    private authToken: string,
    private fromNumber: string
  ) {}

  async sendSms(to: string, message: string): Promise<SmsResult> {
    const credentials = btoa(`${this.accountSid}:${this.authToken}`)
    const params = new URLSearchParams({ From: this.fromNumber, To: to, Body: message })

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data.message ?? "Twilio error" }
    }

    return { success: true, messageId: data.sid }
  }
}

function getSmsProvider(
  provider: string,
  credentials: Record<string, string>
): SmsProvider {
  if (provider === "africas_talking") {
    return new AfricasTalkingProvider(
      credentials.AT_API_KEY ?? "",
      credentials.AT_USERNAME ?? "",
      credentials.AT_SENDER_ID ?? "AlphaFuel"
    )
  }
  return new TwilioProvider(
    credentials.TWILIO_ACCOUNT_SID ?? "",
    credentials.TWILIO_AUTH_TOKEN ?? "",
    credentials.TWILIO_FROM_NUMBER ?? ""
  )
}

function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone)
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const { customer_id, phone, message } = await req.json()

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: "phone and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Validate phone number
    if (!isValidE164(phone)) {
      await supabase.from("fuel_sms_log").insert({
        customer_id: customer_id ?? null,
        phone,
        message,
        provider: "africas_talking",
        status: "skipped",
        provider_response: { reason: "Invalid phone number format" },
      })

      return new Response(
        JSON.stringify({ success: false, skipped: true, reason: "Invalid phone number" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Load SMS provider from settings
    const { data: providerSetting } = await supabase
      .from("fuel_settings")
      .select("value")
      .eq("key", "sms_provider")
      .single()

    const providerName = providerSetting?.value ?? "africas_talking"

    // Load credentials from env (Vault integration would use supabase.rpc)
    const credentials: Record<string, string> = {
      AT_API_KEY: Deno.env.get("AT_API_KEY") ?? "",
      AT_USERNAME: Deno.env.get("AT_USERNAME") ?? "",
      AT_SENDER_ID: Deno.env.get("AT_SENDER_ID") ?? "AlphaFuel",
      TWILIO_ACCOUNT_SID: Deno.env.get("TWILIO_ACCOUNT_SID") ?? "",
      TWILIO_AUTH_TOKEN: Deno.env.get("TWILIO_AUTH_TOKEN") ?? "",
      TWILIO_FROM_NUMBER: Deno.env.get("TWILIO_FROM_NUMBER") ?? "",
    }

    const provider = getSmsProvider(providerName, credentials)
    const result = await provider.sendSms(phone, message)

    // Log the SMS
    await supabase.from("fuel_sms_log").insert({
      customer_id: customer_id ?? null,
      phone,
      message,
      provider: providerName,
      status: result.success ? "sent" : "failed",
      provider_response: result,
    })

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("SMS error:", err)
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
