import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function normalisePhone(phone: string): string {
  let p = phone.replace(/\s+/g, "").replace(/[^+\d]/g, "")
  if (p.startsWith("+254")) return p
  if (p.startsWith("254")) return `+${p}`
  if (p.startsWith("0")) return `+254${p.slice(1)}`
  if (p.length === 9) return `+254${p}`
  return p
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

    const { payment_id, customer_id: manualCustomerId } = await req.json()

    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: "payment_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Load payment record
    const { data: payment, error: paymentError } = await supabase
      .from("fuel_payments")
      .select("*")
      .eq("id", payment_id)
      .single()

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Idempotency guard: skip if already reconciled
    if (payment.status === "reconciled") {
      return new Response(
        JSON.stringify({ success: true, message: "Already reconciled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    let matchedCustomer: { id: string; full_name: string; phone: string; outstanding_balance: number } | null = null

    // Manual override
    if (manualCustomerId) {
      const { data: customer } = await supabase
        .from("fuel_customers")
        .select("id, full_name, phone, outstanding_balance")
        .eq("id", manualCustomerId)
        .eq("is_active", true)
        .single()
      matchedCustomer = customer ?? null
    }

    // Step 1: Phone number match
    if (!matchedCustomer && payment.raw_phone) {
      const normalised = normalisePhone(payment.raw_phone)
      const { data: customers } = await supabase
        .from("fuel_customers")
        .select("id, full_name, phone, outstanding_balance")
        .eq("is_active", true)

      const phoneMatches = (customers ?? []).filter(c => normalisePhone(c.phone) === normalised)
      if (phoneMatches.length === 1) {
        matchedCustomer = phoneMatches[0]
      }
    }

    // Step 2: Reference match
    if (!matchedCustomer && payment.raw_reference) {
      const { data: customers } = await supabase
        .from("fuel_customers")
        .select("id, full_name, phone, outstanding_balance")
        .eq("is_active", true)
        .ilike("phone", `%${payment.raw_reference}%`)

      if ((customers ?? []).length === 1) {
        matchedCustomer = customers![0]
      }
    }

    // Step 3: Name keyword match in narration
    if (!matchedCustomer && payment.raw_narration) {
      const { data: customers } = await supabase
        .from("fuel_customers")
        .select("id, full_name, phone, outstanding_balance")
        .eq("is_active", true)

      const narrationLower = payment.raw_narration.toLowerCase()
      const nameMatches = (customers ?? []).filter(c =>
        narrationLower.includes(c.full_name.toLowerCase())
      )

      if (nameMatches.length === 1) {
        matchedCustomer = nameMatches[0]
      }
    }

    if (!matchedCustomer) {
      // No match - leave as pending
      return new Response(
        JSON.stringify({ success: true, matched: false, message: "No unique match found, payment left pending" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Post payment atomically
    const newBalance = Number(matchedCustomer.outstanding_balance) - Number(payment.amount)

    // Update payment status
    const { error: updatePaymentError } = await supabase
      .from("fuel_payments")
      .update({
        customer_id: matchedCustomer.id,
        status: "reconciled",
        reconciled_at: new Date().toISOString(),
      })
      .eq("id", payment_id)

    if (updatePaymentError) {
      return new Response(
        JSON.stringify({ error: "Failed to update payment", details: updatePaymentError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Update customer outstanding balance
    await supabase
      .from("fuel_customers")
      .update({ outstanding_balance: Math.max(0, newBalance) })
      .eq("id", matchedCustomer.id)

    // Broadcast Realtime event
    await supabase.channel("reconciliation").send({
      type: "broadcast",
      event: "payment_reconciled",
      payload: {
        payment_id,
        customer_id: matchedCustomer.id,
        amount: payment.amount,
      },
    })

    // Trigger SMS notification
    supabase.functions.invoke("send-sms", {
      body: {
        customer_id: matchedCustomer.id,
        phone: matchedCustomer.phone,
        message: `Dear ${matchedCustomer.full_name}, your payment of KES ${Number(payment.amount).toLocaleString()} via ${(payment.channel ?? "").replace(/_/g, " ")} has been received. New balance: KES ${Math.max(0, newBalance).toLocaleString()}. Thank you.`,
      },
    }).catch(console.error)

    return new Response(
      JSON.stringify({ success: true, matched: true, customer_id: matchedCustomer.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("Reconcile error:", err)
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
