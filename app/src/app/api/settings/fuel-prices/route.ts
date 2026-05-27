import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const FuelPriceSchema = z.object({
  fuel_type_id: z.string().uuid(),
  price_per_litre: z.number().positive(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("dealer_admin")
    const body = await req.json()
    const parsed = FuelPriceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
    }

    const { fuel_type_id, price_per_litre } = parsed.data
    const supabase = await createClient()

    // Get current price for audit log
    const { data: current } = await supabase
      .from("fuel_fuel_types")
      .select("current_price_per_litre")
      .eq("id", fuel_type_id)
      .single()

    // Update current price
    const { error: updateError } = await supabase
      .from("fuel_fuel_types")
      .update({ current_price_per_litre: price_per_litre })
      .eq("id", fuel_type_id)

    if (updateError) {
      return NextResponse.json({ error: "Failed to update price" }, { status: 500 })
    }

    // Insert price history
    await supabase.from("fuel_fuel_prices").insert({
      fuel_type_id,
      price_per_litre,
      effective_from: new Date().toISOString(),
      changed_by: user.id,
    })

    // Audit log
    await supabase.from("fuel_audit_log").insert({
      table_name: "fuel_fuel_types",
      record_id: fuel_type_id,
      action: "update",
      old_values: { current_price_per_litre: current?.current_price_per_litre },
      new_values: { current_price_per_litre: price_per_litre },
      changed_by: user.id,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.text()
      return new NextResponse(body, { status: err.status, headers: { "Content-Type": "application/json" } })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
