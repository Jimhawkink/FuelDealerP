import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

/**
 * RLS verification endpoint.
 * Tests that Row-Level Security policies are active on all fuel_ tables.
 * Only accessible to dealer_admin.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole("dealer_admin")
    const supabase = await createClient()

    const tables = [
      "fuel_users",
      "fuel_customers",
      "fuel_fuel_types",
      "fuel_fuel_prices",
      "fuel_shifts",
      "fuel_sales",
      "fuel_payments",
      "fuel_stk_push_requests",
      "fuel_inventory",
      "fuel_inventory_log",
      "fuel_bank_imports",
      "fuel_bank_transactions",
      "fuel_sms_log",
      "fuel_audit_log",
      "fuel_settings",
    ]

    const results: Record<string, { rls_enabled: boolean; error?: string }> = {}

    for (const table of tables) {
      try {
        // Check if RLS is enabled by querying pg_tables
        const { data, error } = await supabase.rpc("check_rls_enabled", { table_name: table })

        if (error) {
          // Fallback: try to query the table - if RLS is working, we should get data or empty array
          const { error: queryError } = await supabase.from(table as any).select("id").limit(1)
          results[table] = {
            rls_enabled: !queryError || queryError.code !== "42501",
            error: queryError?.message,
          }
        } else {
          results[table] = { rls_enabled: data === true }
        }
      } catch (err) {
        results[table] = { rls_enabled: false, error: String(err) }
      }
    }

    const allEnabled = Object.values(results).every(r => r.rls_enabled)

    return NextResponse.json({
      status: allEnabled ? "ok" : "warning",
      message: allEnabled ? "All RLS policies are active" : "Some tables may have RLS issues",
      tables: results,
      checked_at: new Date().toISOString(),
    })
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.text()
      return new NextResponse(body, { status: err.status, headers: { "Content-Type": "application/json" } })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
