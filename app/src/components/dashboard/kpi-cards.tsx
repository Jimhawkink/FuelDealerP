"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { TrendingUp, DollarSign, CreditCard, AlertCircle, Droplets } from "lucide-react"

interface KpiData {
  todaySalesLitres: number
  todaySalesKes: number
  todayPaymentsKes: number
  totalOutstanding: number
  pendingCount: number
}

interface KpiCardsProps {
  initial: KpiData
  role: string
  userId: string
}

export function KpiCards({ initial, role, userId }: KpiCardsProps) {
  const [kpi, setKpi] = useState<KpiData>(initial)
  const supabase = createClient()

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]

    const salesChannel = supabase
      .channel("dashboard-sales")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "fuel_sales" }, (payload) => {
        const sale = payload.new as any
        const saleDate = new Date(sale.created_at).toISOString().split("T")[0]
        if (saleDate === today) {
          if (role === "attendant" && sale.attendant_id !== userId) return
          setKpi((prev) => ({
            ...prev,
            todaySalesLitres: prev.todaySalesLitres + Number(sale.quantity_litres),
            todaySalesKes: prev.todaySalesKes + Number(sale.total_amount),
          }))
        }
      })
      .subscribe()

    const paymentsChannel = supabase
      .channel("dashboard-payments")
      .on("postgres_changes", { event: "*", schema: "public", table: "fuel_payments" }, (payload) => {
        const payment = payload.new as any
        if (payment.status === "reconciled") {
          const payDate = new Date(payment.created_at).toISOString().split("T")[0]
          if (payDate === today) {
            setKpi((prev) => ({
              ...prev,
              todayPaymentsKes: prev.todayPaymentsKes + Number(payment.amount),
            }))
          }
        }
        // Refresh pending count
        supabase
          .from("fuel_payments")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")
          .then(({ count }) => {
            setKpi((prev) => ({ ...prev, pendingCount: count ?? 0 }))
          })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(salesChannel)
      supabase.removeChannel(paymentsChannel)
    }
  }, [role, userId])

  const cards = [
    {
      label: "Today Sales (L)",
      value: `${kpi.todaySalesLitres.toFixed(1)} L`,
      icon: <Droplets className="w-5 h-5" />,
      color: "bg-blue-50 text-blue-600 border-blue-100",
      iconBg: "bg-blue-100",
    },
    {
      label: "Today Sales (KES)",
      value: `KES ${kpi.todaySalesKes.toLocaleString()}`,
      icon: <TrendingUp className="w-5 h-5" />,
      color: "bg-green-50 text-green-600 border-green-100",
      iconBg: "bg-green-100",
    },
    {
      label: "Payments Received",
      value: `KES ${kpi.todayPaymentsKes.toLocaleString()}`,
      icon: <DollarSign className="w-5 h-5" />,
      color: "bg-amber-50 text-amber-600 border-amber-100",
      iconBg: "bg-amber-100",
      hidden: role === "attendant",
    },
    {
      label: "Total Outstanding",
      value: `KES ${kpi.totalOutstanding.toLocaleString()}`,
      icon: <CreditCard className="w-5 h-5" />,
      color: "bg-red-50 text-red-600 border-red-100",
      iconBg: "bg-red-100",
      hidden: role === "attendant",
    },
    {
      label: "Pending Reconciliation",
      value: kpi.pendingCount.toString(),
      icon: <AlertCircle className="w-5 h-5" />,
      color: kpi.pendingCount > 0 ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-slate-50 text-slate-500 border-slate-100",
      iconBg: kpi.pendingCount > 0 ? "bg-orange-100" : "bg-slate-100",
      hidden: role === "attendant",
      href: "/dashboard/payments/reconcile",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards
        .filter((c) => !c.hidden)
        .map((card) => (
          <a
            key={card.label}
            href={card.href ?? "#"}
            className={`rounded-xl border p-4 flex flex-col gap-3 transition-all hover:shadow-md ${card.color} ${card.href ? "cursor-pointer" : "cursor-default"}`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.iconBg}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs opacity-70 mt-0.5">{card.label}</p>
            </div>
          </a>
        ))}
    </div>
  )
}
