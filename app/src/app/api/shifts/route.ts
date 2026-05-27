import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("attendant")
    const supabase = await createClient()
    // Close any existing open shift first
    await supabase.from("fuel_shifts").update({ status: "closed", ended_at: new Date().toISOString() }).eq("attendant_id", user.id).eq("status", "open")
    const { data, error } = await supabase.from("fuel_shifts").insert({ attendant_id: user.id, status: "open" }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ shift: data }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return new NextResponse(await err.text(), { status: err.status })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("attendant")
    const supabase = await createClient()
    const { data } = await supabase.from("fuel_shifts").select("*, fuel_users!attendant_id(full_name)").eq("attendant_id", user.id).order("started_at", { ascending: false }).limit(20)
    return NextResponse.json({ shifts: data })
  } catch (err) {
    if (err instanceof Response) return new NextResponse(await err.text(), { status: err.status })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
