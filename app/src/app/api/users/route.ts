import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const createUserSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["dealer_admin", "accountant", "attendant"]),
})

export async function POST(req: NextRequest) {
  try {
    // Only dealer_admin can create users
    await requireRole("dealer_admin")

    const body = await req.json()
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { full_name, email, role } = parsed.data
    const adminClient = createAdminClient()

    // Create auth user with a random password (user will reset via email)
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      app_metadata: { role },
      user_metadata: { full_name },
    })

    if (authError || !authUser.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Failed to create auth user" },
        { status: 400 }
      )
    }

    // Insert into fuel_users table
    const supabase = await createClient()
    const { data: fuelUser, error: dbError } = await supabase
      .from("fuel_users")
      .insert({ id: authUser.user.id, full_name, email, role })
      .select()
      .single()

    if (dbError) {
      // Rollback: delete the auth user if DB insert fails
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ user: fuelUser }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(await err.text(), { status: err.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    await requireRole("dealer_admin")
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("fuel_users")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ users: data })
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(await err.text(), { status: err.status })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
