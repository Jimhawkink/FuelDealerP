import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { LowStockBanner } from "@/components/layout/low-stock-banner"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Protect all dashboard routes
  let user
  try {
    user = await getSessionUser()
  } catch {
    redirect("/login")
  }

  // Get pending reconciliation count for notification bell
  const supabase = await createClient()
  const { count: pendingCount } = await supabase
    .from("fuel_payments")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar role={user.role} userName={user.full_name ?? user.email ?? "User"} />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          role={user.role}
          userName={user.full_name ?? user.email ?? "User"}
          pendingCount={pendingCount ?? 0}
        />
        <LowStockBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
