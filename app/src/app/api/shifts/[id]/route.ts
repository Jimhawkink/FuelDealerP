import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole("attendant")
    const { id } = await params
    const supabase = await createClient()

    // Verify the shift belongs to the current user
    const { data: shift, error: fetchError } = await supabase
      .from("fuel_shifts")
      .select("id, attendant_id, status")
      .eq("id", id)
      .single()

    if (fetchError || !shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })
    }

    if (shift.attendant_id !== user.id && user.role !== "dealer_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (shift.status === "closed") {
      return NextResponse.json({ error: "Shift is already closed" }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from("fuel_shifts")
      .update({ status: "closed", ended_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (updateError || !updated) {
      return NextResponse.json({ error: "Failed to close shift" }, { status: 500 })
    }

    return NextResponse.json({ shift: updated })
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.text()
      return new NextResponse(body, { status: err.status, headers: { "Content-Type": "application/json" } })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
