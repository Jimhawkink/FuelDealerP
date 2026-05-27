import { createClient } from "@/lib/supabase/server"
import { getSessionUser } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { CustomerDetail } from "@/components/customers/customer-detail"

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  let user
  try { user = await getSessionUser() } catch { redirect("/login") }

  const { id } = await params
  const supabase = await createClient()

  const { data: customer, error } = await supabase
    .from("fuel_customers")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !customer) notFound()

  // Fetch statement: sales + payments
  const [salesRes, paymentsRes] = await Promise.all([
    supabase
      .from("fuel_sales")
      .select("id, created_at, total_amount, sale_type, payment_channel, fuel_fuel_types!fuel_sales_fuel_type_id_fkey(name), quantity_litres")
      .eq("customer_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("fuel_payments")
      .select("id, created_at, amount, channel, status, reconciled_at")
      .eq("customer_id", id)
      .eq("status", "reconciled")
      .order("created_at", { ascending: true }),
  ])

  // Build statement with running balance
  type StatementEntry = {
    id: string
    date: string
    type: "sale" | "payment"
    description: string
    debit: number
    credit: number
    balance: number
  }

  const entries: StatementEntry[] = []
  let runningBalance = 0

  const allEvents = [
    ...(salesRes.data ?? []).map((s: any) => ({
      id: s.id,
      date: s.created_at,
      type: "sale" as const,
      description: `${s.fuel_fuel_types?.name ?? "Fuel"} - ${Number(s.quantity_litres).toFixed(3)}L (${s.sale_type === "credit" ? "Credit" : "Pay Now"})`,
      debit: s.sale_type === "credit" ? Number(s.total_amount) : 0,
      credit: 0,
    })),
    ...(paymentsRes.data ?? []).map((p: any) => ({
      id: p.id,
      date: p.created_at,
      type: "payment" as const,
      description: `Payment - ${(p.channel ?? "").replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}`,
      debit: 0,
      credit: Number(p.amount),
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  for (const event of allEvents) {
    runningBalance += event.debit - event.credit
    entries.push({ ...event, balance: runningBalance })
  }

  // Debt aging
  const now = new Date()
  const aging = { d0_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 }

  for (const sale of salesRes.data ?? []) {
    if ((sale as any).sale_type !== "credit") continue
    const saleDate = new Date((sale as any).created_at)
    const ageDays = Math.floor((now.getTime() - saleDate.getTime()) / 86400000)
    const amount = Number((sale as any).total_amount)

    if (ageDays <= 30) aging.d0_30 += amount
    else if (ageDays <= 60) aging.d31_60 += amount
    else if (ageDays <= 90) aging.d61_90 += amount
    else aging.d90plus += amount
  }

  return (
    <CustomerDetail
      customer={customer}
      statement={entries}
      aging={aging}
      role={user.role}
    />
  )
}
