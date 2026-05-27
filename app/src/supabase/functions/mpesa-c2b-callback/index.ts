import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Validate Authorization header (Daraja security credential)
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ResultCode: 1, ResultDesc: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const body = await req.json()

    // Extract Daraja C2B fields
    const {
      TransID,
      TransAmount,
      MSISDN,
      BillRefNumber,
      TransTime,
      BusinessShortCode,
    } = body

    if (!TransID || !TransAmount) {
      return new Response(
        JSON.stringify({ ResultCode: 1, ResultDesc: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const idempotency_key = `c2b:${TransID}`

    // Idempotency check
    const { data: existing } = await supabase
      .from("fuel_payments")
      .select("id")
      .eq("idempotency_key", idempotency_key)
      .single()

    if (existing) {
      // Already processed - return success (idempotent)
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Normalise phone number to +254 format
    let rawPhone = String(MSISDN ?? "")
    if (rawPhone.startsWith("254")) rawPhone = `+${rawPhone}`
    else if (rawPhone.startsWith("0")) rawPhone = `+254${rawPhone.slice(1)}`
    else if (!rawPhone.startsWith("+")) rawPhone = `+254${rawPhone}`

    // Insert payment record
    const { data: payment, error: insertError } = await supabase
      .from("fuel_payments")
      .insert({
        amount: parseFloat(TransAmount),
        channel: "mpesa_paybill",
        idempotency_key,
        status: "pending",
        raw_phone: rawPhone,
        raw_reference: BillRefNumber ?? null,
        raw_narration: `C2B ${BusinessShortCode ?? ""} ${TransTime ?? ""}`.trim(),
      })
      .select()
      .single()

    if (insertError || !payment) {
      console.error("Failed to insert payment:", insertError)
      // Still return success to Daraja to prevent retries
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Call reconcile-payment function asynchronously
    supabase.functions.invoke("reconcile-payment", {
      body: { payment_id: payment.id },
    }).catch(console.error)

    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("C2B callback error:", err)
    // Always return success to Daraja to prevent retries
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
