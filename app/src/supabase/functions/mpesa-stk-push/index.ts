import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// OAuth token cache with 55-minute TTL
interface TokenCache {
  token: string
  expiresAt: number
}

declare const globalThis: { _mpesaTokenCache?: TokenCache }

async function getMpesaToken(
  consumerKey: string,
  consumerSecret: string,
  baseUrl: string
): Promise<string> {
  const now = Date.now()

  // Return cached token if still valid
  if (globalThis._mpesaTokenCache && globalThis._mpesaTokenCache.expiresAt > now) {
    return globalThis._mpesaTokenCache.token
  }

  const credentials = btoa(`${consumerKey}:${consumerSecret}`)
  const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  })

  if (!res.ok) {
    throw new Error(`OAuth failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()
  const token = data.access_token

  // Cache for 55 minutes (token expires in 60 min)
  globalThis._mpesaTokenCache = {
    token,
    expiresAt: now + 55 * 60 * 1000,
  }

  return token
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

    const { customer_id, amount, phone, initiated_by } = await req.json()

    if (!customer_id || !amount || !phone) {
      return new Response(
        JSON.stringify({ error: "customer_id, amount, and phone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Load Daraja credentials from Supabase Vault
    const { data: secrets, error: secretsError } = await supabase.rpc("get_secrets", {
      secret_names: ["DARAJA_CONSUMER_KEY", "DARAJA_CONSUMER_SECRET", "DARAJA_PAYBILL_NUMBER", "DARAJA_PASSKEY"],
    })

    // Fallback to env vars if vault not configured
    const consumerKey = secrets?.DARAJA_CONSUMER_KEY ?? Deno.env.get("DARAJA_CONSUMER_KEY") ?? ""
    const consumerSecret = secrets?.DARAJA_CONSUMER_SECRET ?? Deno.env.get("DARAJA_CONSUMER_SECRET") ?? ""
    const shortCode = secrets?.DARAJA_PAYBILL_NUMBER ?? Deno.env.get("DARAJA_PAYBILL_NUMBER") ?? ""
    const passkey = secrets?.DARAJA_PASSKEY ?? Deno.env.get("DARAJA_PASSKEY") ?? ""

    const mpesaEnv = Deno.env.get("MPESA_ENV") ?? "sandbox"
    const baseUrl = mpesaEnv === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke"

    const callbackUrl = Deno.env.get("MPESA_STK_CALLBACK_URL") ?? `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-stk-callback`

    // Get OAuth token
    const token = await getMpesaToken(consumerKey, consumerSecret, baseUrl)

    // Build STK Push payload
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)
    const password = btoa(`${shortCode}${passkey}${timestamp}`)

    // Normalise phone to 254XXXXXXXXX format
    let normalizedPhone = phone.replace(/\s+/g, "")
    if (normalizedPhone.startsWith("+")) normalizedPhone = normalizedPhone.slice(1)
    if (normalizedPhone.startsWith("0")) normalizedPhone = `254${normalizedPhone.slice(1)}`

    const stkPayload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(amount),
      PartyA: normalizedPhone,
      PartyB: shortCode,
      PhoneNumber: normalizedPhone,
      CallBackURL: callbackUrl,
      AccountReference: "AlphaFuel",
      TransactionDesc: "Fuel Payment",
    }

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stkPayload),
    })

    const stkData = await stkRes.json()

    if (!stkRes.ok || stkData.ResponseCode !== "0") {
      return new Response(
        JSON.stringify({ error: "STK Push failed", details: stkData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Insert STK push request record
    const { data: stkRequest, error: insertError } = await supabase
      .from("fuel_stk_push_requests")
      .insert({
        customer_id,
        amount,
        phone: normalizedPhone,
        checkout_request_id: stkData.CheckoutRequestID,
        merchant_request_id: stkData.MerchantRequestID,
        status: "pending",
        initiated_by: initiated_by ?? null,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Failed to insert STK request:", insertError)
    }

    return new Response(
      JSON.stringify({
        checkoutRequestId: stkData.CheckoutRequestID,
        merchantRequestId: stkData.MerchantRequestID,
        customerMessage: stkData.CustomerMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("STK Push error:", err)
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
