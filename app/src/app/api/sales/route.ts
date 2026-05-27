import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const saleSchema = z.object({
  customer_id: z.string().uuid(),
  fuel_type_id: z.string().uuid(),
  quantity_litres: z.number().positive(),
  unit_price: z.number().positive(),
  sale_type: z.enum(["pay_now", "credit"]),
  payment_channel: z.enum(["mpesa_paybill","mpesa_till","mpesa_stk","pesalink","eft_rtgs","bank_deposit","cash"]).optional(),
  shift_id: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("attendant")
    const body = await req.json()
    const parsed = saleSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })

    const { customer_id, fuel_type_id, quantity_litres, unit_price, sale_type, payment_channel, shift_id } = parsed.data
    const total_amount = quantity_litres * unit_price
    const supabase = await createClient()

    // Check inventory
    const { data: inv } = await supabase.from("fuel_inventory").select("stock_litres").eq("fuel_type_id", fuel_type_id).single()
    if (!inv || inv.stock_litres < quantity_litres) {
      return NextResponse.json({ error: `Insufficient stock. Available: ${inv?.stock_litres ?? 0} L` }, { status: 400 })
    }

    // Check credit limit for credit sales
    if (sale_type === "credit") {
      const { data: customer } = await supabase.from("fuel_customers").select("outstanding_balance, credit_limit, is_active").eq("id", customer_id).single()
      if (!customer?.is_active) return NextResponse.json({ error: "Customer account is inactive" }, { status: 400 })
      if (customer.outstanding_balance + total_amount > customer.credit_limit) {
        return NextResponse.json({
          error: `Credit limit exceeded. Balance: KES ${customer.outstanding_balance}, Limit: KES ${customer.credit_limit}, Sale: KES ${total_amount}`
        }, { status: 400 })
      }
    }

    // Insert sale
    const { data: sale, error: saleError } = await supabase.from("fuel_sales").insert({
      customer_id, fuel_type_id, quantity_litres, unit_price, sale_type,
      payment_channel: sale_type === "pay_now" ? payment_channel : null,
      shift_id, attendant_id: user.id,
    }).select().single()
    if (saleError) return NextResponse.json({ error: saleError.message }, { status: 500 })

    // Update inventory
    await supabase.from("fuel_inventory").update({ stock_litres: inv.stock_litres - quantity_litres, updated_at: new Date().toISOString() }).eq("fuel_type_id", fuel_type_id)

    // Log inventory change
    await supabase.from("fuel_inventory_log").insert({
      fuel_type_id, quantity_change: -quantity_litres,
      resulting_balance: inv.stock_litres - quantity_litres,
      event_type: "sale", reference_id: sale.id, changed_by: user.id,
    })

    // Update outstanding balance for credit sales
    if (sale_type === "credit") {
      await supabase.rpc("increment_outstanding_balance", { p_customer_id: customer_id, p_amount: total_amount })
        .then(async () => {
          // Fallback if RPC doesn't exist
        })
      const { data: cust } = await supabase.from("fuel_customers").select("outstanding_balance").eq("id", customer_id).single()
      await supabase.from("fuel_customers").update({ outstanding_balance: (cust?.outstanding_balance ?? 0) + total_amount }).eq("id", customer_id)
    }

    // For pay_now cash: create reconciled payment
    if (sale_type === "pay_now" && payment_channel === "cash") {
      await supabase.from("fuel_payments").insert({
        customer_id, amount: total_amount, channel: "cash",
        idempotency_key: `cash:${sale.id}`, status: "reconciled",
        reconciled_by: user.id, reconciled_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ sale }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return new NextResponse(await err.text(), { status: err.status })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireRole("attendant")
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") ?? "1")
    const limit = 50
    const from = (page - 1) * limit

    const { data, count } = await supabase.from("fuel_sales")
      .select("*, fuel_customers(full_name), fuel_fuel_types(name), fuel_users!attendant_id(full_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1)

    return NextResponse.json({ sales: data, total: count, page, limit })
  } catch (err) {
    if (err instanceof Response) return new NextResponse(await err.text(), { status: err.status })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
