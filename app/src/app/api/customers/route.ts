import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const customerSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(10).max(20),
  email: z.string().email().optional().or(z.literal("")),
  company_name: z.string().optional(),
  credit_limit: z.number().min(0).default(0),
})

export async function GET(req: NextRequest) {
  try {
    await requireRole("attendant")
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") ?? ""
    let query = supabase.from("fuel_customers").select("*").order("full_name")
    if (search) query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ customers: data })
  } catch (err) {
    if (err instanceof Response) return new NextResponse(await err.text(), { status: err.status })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("dealer_admin")
    const body = await req.json()
    const parsed = customerSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
    const supabase = await createClient()
    const { data, error } = await supabase.from("fuel_customers").insert(parsed.data).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ customer: data }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return new NextResponse(await err.text(), { status: err.status })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
