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

    const body = await req.json()
    const callbackData = body?.Body?.stkCallback

    if (!callbackData) {
      return new Response(
        JSON.stringify({ error: "Invalid callback body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callbackData

    // Find the STK push request
    const { data: stkRequest, error: fetchError } = await supabase
      .from("fuel_stk_push_requests")
      .select("id, customer_id, amount, phone")
      .eq("checkout_request_id", CheckoutRequestID)
      .single()

    if (fetchError || !stkRequest) {
      console.error("STK request not found:", CheckoutRequestID)
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (ResultCode === 0) {
      // Payment successful
      // Extract metadata
      const metadata: Record<string, string | number> = {}
      if (CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
          metadata[item.Name] = item.Value
        }
      }

      const mpesaReceiptNumber = String(metadata.MpesaReceiptNumber ?? "")
      const amount = Number(metadata.Amount ?? stkRequest.amount)
      const idempotency_key = `stk:${CheckoutRequestID}`

      // Check idempotency
      const { data: existing } = await supabase
        .from("fuel_payments")
        .select("id")
        .eq("idempotency_key", idempotency_key)
        .single()

      if (!existing) {
        // Insert payment
        const { data: payment, error: paymentError } = await supabase
          .from("fuel_payments")
          .insert({
            customer_id: stkRequest.customer_id,
            amount,
            channel: "mpesa_stk",
            idempotency_key,
            status: "pending",
            raw_reference: mpesaReceiptNumber,
            raw_phone: String(metadata.PhoneNumber ?? stkRequest.phone),
          })
          .select()
          .single()

        if (!paymentError && payment) {
          // Call reconcile-payment
          await supabase.functions.invoke("reconcile-payment", {
            body: { payment_id: payment.id },
          })
        }
      }

      // Update STK request status
      await supabase
        .from("fuel_stk_push_requests")
        .update({ status: "success", updated_at: new Date().toISOString() })
        .eq("id", stkRequest.id)
    } else {
      // Payment failed or cancelled
      const status = ResultCode === 1032 ? "cancelled" : "failed"
      await supabase
        .from("fuel_stk_push_requests")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", stkRequest.id)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("STK callback error:", err)
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
