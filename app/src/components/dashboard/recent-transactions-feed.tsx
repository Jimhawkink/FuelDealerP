"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ShoppingCart, CreditCard } from "lucide-react"

interface Transaction {
  id: string
  type: "sale" | "payment"
  customerName: string
  amount: number
  channel?: string
  createdAt: string
}

interface RecentTransactionsFeedProps {
  initial: Transaction[]
}

export function RecentTransactionsFeed({ initial }: RecentTransactionsFeedProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initial)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel("recent-transactions")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "fuel_sales" }, () => {
        // Refetch last 20
        fetchRecent()
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "fuel_payments" }, () => {
        fetchRecent()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchRecent = async () => {
    const [salesRes, paymentsRes] = await Promise.all([
      supabase.from("fuel_sales").select("id, total_amount, created_at, fuel_customers(full_name), payment_channel").order("created_at", { ascending: false }).limit(10),
      supabase.from("fuel_payments").select("id, amount, channel, created_at, fuel_customers(full_name)").eq("status", "reconciled").order("created_at", { ascending: false }).limit(10),
    ])

    const combined: Transaction[] = [
      ...(salesRes.data ?? []).map((s: any) => ({
        id: s.id, type: "sale" as const,
        customerName: s.fuel_customers?.full_name ?? "Unknown",
        amount: s.total_amount, channel: s.payment_channel,
        createdAt: s.created_at,
      })),
      ...(paymentsRes.data ?? []).map((p: any) => ({
        id: p.id, type: "payment" as const,
        customerName: p.fuel_customers?.full_name ?? "Unknown",
        amount: p.amount, channel: p.channel,
        createdAt: p.created_at,
      })),
    ]
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    setTransactions(combined.slice(0, 20))
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800">Recent Transactions</h3>
      </div>
      <div className="divide-y divide-slate-50">
        {transactions.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-8">No transactions yet</p>
        )}
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.type === "sale" ? "bg-blue-50" : "bg-green-50"}`}>
              {tx.type === "sale"
                ? <ShoppingCart className="w-4 h-4 text-blue-500" />
                : <CreditCard className="w-4 h-4 text-green-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{tx.customerName}</p>
              <p className="text-xs text-slate-400 capitalize">{tx.type}  {tx.channel?.replace("_", " ") ?? ""}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-sm font-semibold ${tx.type === "sale" ? "text-slate-800" : "text-green-600"}`}>
                KES {Number(tx.amount).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">
                {new Date(tx.createdAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
