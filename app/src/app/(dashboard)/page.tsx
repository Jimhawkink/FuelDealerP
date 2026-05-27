import { createClient } from "@/lib/supabase/server"
import { getSessionUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { RecentTransactionsFeed } from "@/components/dashboard/recent-transactions-feed"
import { TopDebtors } from "@/components/dashboard/top-debtors"
import { PaymentChannelChart } from "@/components/dashboard/payment-channel-chart"

export default async function DashboardPage() {
  let user
  try { user = await getSessionUser() } catch { redirect("/login") }

  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  // Fetch initial KPI data
  const [salesRes, paymentsRes, outstandingRes, pendingRes, channelRes, recentSalesRes, recentPaymentsRes] =
    await Promise.all([
      // Today sales
      supabase.from("fuel_sales")
        .select("quantity_litres, total_amount, attendant_id")
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`),
      // Today payments received
      supabase.from("fuel_payments")
        .select("amount")
        .eq("status", "reconciled")
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`),
      // Total outstanding
      supabase.from("fuel_customers").select("outstanding_balance").gt("outstanding_balance", 0),
      // Pending count
      supabase.from("fuel_payments").select("*", { count: "exact", head: true }).eq("status", "pending"),
      // Channel breakdown today
      supabase.from("fuel_payments")
        .select("channel, amount")
        .eq("status", "reconciled")
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`),
      // Recent sales
      supabase.from("fuel_sales")
        .select("id, total_amount, created_at, payment_channel, fuel_customers(full_name)")
        .order("created_at", { ascending: false }).limit(10),
      // Recent payments
      supabase.from("fuel_payments")
        .select("id, amount, channel, created_at, fuel_customers(full_name)")
        .eq("status", "reconciled")
        .order("created_at", { ascending: false }).limit(10),
    ])

  // Filter attendant sales to own shifts
  const salesData = user.role === "attendant"
    ? (salesRes.data ?? []).filter((s: any) => s.attendant_id === user.id)
    : (salesRes.data ?? [])

  const todaySalesLitres = salesData.reduce((sum: number, s: any) => sum + Number(s.quantity_litres), 0)
  const todaySalesKes = salesData.reduce((sum: number, s: any) => sum + Number(s.total_amount), 0)
  const todayPaymentsKes = (paymentsRes.data ?? []).reduce((sum: number, p: any) => sum + Number(p.amount), 0)
  const totalOutstanding = (outstandingRes.data ?? []).reduce((sum: number, c: any) => sum + Number(c.outstanding_balance), 0)
  const pendingCount = pendingRes.count ?? 0

  // Channel breakdown
  const channelMap: Record<string, number> = {}
  for (const p of channelRes.data ?? []) {
    channelMap[p.channel] = (channelMap[p.channel] ?? 0) + Number(p.amount)
  }
  const channelData = Object.entries(channelMap).map(([channel, amount]) => ({ channel, amount }))

  // Recent transactions
  const recentTransactions = [
    ...(recentSalesRes.data ?? []).map((s: any) => ({
      id: s.id, type: "sale" as const,
      customerName: s.fuel_customers?.full_name ?? "Unknown",
      amount: s.total_amount, channel: s.payment_channel,
      createdAt: s.created_at,
    })),
    ...(recentPaymentsRes.data ?? []).map((p: any) => ({
      id: p.id, type: "payment" as const,
      customerName: p.fuel_customers?.full_name ?? "Unknown",
      amount: p.amount, channel: p.channel,
      createdAt: p.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* KPI Cards */}
      <KpiCards
        initial={{ todaySalesLitres, todaySalesKes, todayPaymentsKes, totalOutstanding, pendingCount }}
        role={user.role}
        userId={user.id}
      />

      {/* Charts and lists */}
      {user.role !== "attendant" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentTransactionsFeed initial={recentTransactions} />
          </div>
          <div className="space-y-6">
            <TopDebtors />
            <PaymentChannelChart data={channelData} />
          </div>
        </div>
      )}

      {user.role === "attendant" && (
        <RecentTransactionsFeed initial={recentTransactions} />
      )}
    </div>
  )
}
