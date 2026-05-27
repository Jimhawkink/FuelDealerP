import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  fuel_type_id: z.string().uuid(),
  quantity_litres: z.number().positive(),
  delivery_date: z.string(),
  supplier_reference: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("dealer_admin")
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 })
    const { fuel_type_id, quantity_litres, delivery_date, supplier_reference } = parsed.data
    const supabase = await createClient()

    const { data: inv } = await supabase.from("fuel_inventory").select("stock_litres").eq("fuel_type_id", fuel_type_id).single()
    const newStock = (inv?.stock_litres ?? 0) + quantity_litres

    await supabase.from("fuel_inventory").update({ stock_litres: newStock, updated_at: new Date().toISOString() }).eq("fuel_type_id", fuel_type_id)
    await supabase.from("fuel_inventory_log").insert({ fuel_type_id, quantity_change: quantity_litres, resulting_balance: newStock, event_type: "delivery", changed_by: user.id })

    return NextResponse.json({ success: true, new_stock: newStock })
  } catch (err) {
    if (err instanceof Response) return new NextResponse(await err.text(), { status: err.status })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
