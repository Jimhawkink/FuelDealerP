import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole, getSessionUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const UpdateCustomerSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().min(9).max(20).optional(),
  email: z.string().email().optional().nullable(),
  company_name: z.string().max(100).optional().nullable(),
  credit_limit: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getSessionUser()
    const { id } = await params
    const supabase = await createClient()

    const { data: customer, error } = await supabase
      .from("fuel_customers")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json({ customer })
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.text()
      return new NextResponse(body, { status: err.status, headers: { "Content-Type": "application/json" } })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("dealer_admin")
    const { id } = await params
    const body = await req.json()
    const parsed = UpdateCustomerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = await createClient()

    // If credit_limit is being changed, log it
    if (parsed.data.credit_limit !== undefined) {
      const { data: existing } = await supabase
        .from("fuel_customers")
        .select("credit_limit")
        .eq("id", id)
        .single()

      if (existing && existing.credit_limit !== parsed.data.credit_limit) {
        await supabase.from("fuel_audit_log").insert({
          table_name: "fuel_customers",
          record_id: id,
          action: "update",
          old_values: { credit_limit: existing.credit_limit },
          new_values: { credit_limit: parsed.data.credit_limit },
          changed_by: user.id,
        })
      }
    }

    const { data: customer, error } = await supabase
      .from("fuel_customers")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error || !customer) {
      return NextResponse.json({ error: "Failed to update customer" }, { status: 500 })
    }

    return NextResponse.json({ customer })
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.text()
      return new NextResponse(body, { status: err.status, headers: { "Content-Type": "application/json" } })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("dealer_admin")
    const { id } = await params
    const supabase = await createClient()

    const { data: customer, error } = await supabase
      .from("fuel_customers")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error || !customer) {
      return NextResponse.json({ error: "Failed to deactivate customer" }, { status: 500 })
    }

    await supabase.from("fuel_audit_log").insert({
      table_name: "fuel_customers",
      record_id: id,
      action: "update",
      old_values: { is_active: true },
      new_values: { is_active: false },
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
