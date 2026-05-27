"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Download, FileSpreadsheet } from "lucide-react"

interface InventoryRow {
  fuel_type: string
  opening_stock: number
  deliveries: number
  sales: number
  closing_stock: number
}

export default function InventoryReportPage() {
  const supabase = createClient()
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]
  })
  const [to, setTo] = useState(new Date().toISOString().split("T")[0])
  const [data, setData] = useState<InventoryRow[]>([])

  const fetchData = useCallback(async () => {
    const [ftRes, salesRes, deliveriesRes, currentInvRes] = await Promise.all([
      supabase.from("fuel_fuel_types").select("id, name").order("name"),
      supabase.from("fuel_inventory_log").select("fuel_type_id, quantity_change").eq("event_type", "sale")
        .gte("created_at", `${from}T00:00:00`).lte("created_at", `${to}T23:59:59`),
      supabase.from("fuel_inventory_log").select("fuel_type_id, quantity_change").eq("event_type", "delivery")
        .gte("created_at", `${from}T00:00:00`).lte("created_at", `${to}T23:59:59`),
      supabase.from("fuel_inventory").select("fuel_type_id, stock_litres"),
    ])

    const fuelTypes = ftRes.data ?? []
    const rows: InventoryRow[] = fuelTypes.map((ft: any) => {
      const ftSales = (salesRes.data ?? []).filter((s: any) => s.fuel_type_id === ft.id)
      const ftDeliveries = (deliveriesRes.data ?? []).filter((d: any) => d.fuel_type_id === ft.id)
      const currentInv = (currentInvRes.data ?? []).find((i: any) => i.fuel_type_id === ft.id)

      const totalSales = Math.abs(ftSales.reduce((s: number, r: any) => s + Number(r.quantity_change), 0))
      const totalDeliveries = ftDeliveries.reduce((s: number, r: any) => s + Number(r.quantity_change), 0)
      const closingStock = Number(currentInv?.stock_litres ?? 0)
      const openingStock = closingStock + totalSales - totalDeliveries

      return {
        fuel_type: ft.name,
        opening_stock: Math.max(0, openingStock),
        deliveries: totalDeliveries,
        sales: totalSales,
        closing_stock: closingStock,
      }
    })

    setData(rows)
  }, [supabase, from, to])

  useEffect(() => { fetchData() }, [fetchData])

  const handleExportPdf = async () => {
    const { exportToPdf } = await import("@/lib/export/pdf-export")
    exportToPdf(
      `Inventory Report ${from} to ${to}`,
      ["Fuel Type", "Opening (L)", "Deliveries (L)", "Sales (L)", "Closing (L)"],
      data.map(d => [d.fuel_type.replace(/_/g, " "), d.opening_stock.toFixed(3), d.deliveries.toFixed(3), d.sales.toFixed(3), d.closing_stock.toFixed(3)])
    )
  }

  const handleExportExcel = async () => {
    const { exportToExcel } = await import("@/lib/export/excel-export")
    await exportToExcel(
      `inventory_report_${from}_${to}`,
      "Inventory",
      ["Fuel Type", "Opening (L)", "Deliveries (L)", "Sales (L)", "Closing (L)"],
      data.map(d => [d.fuel_type.replace(/_/g, " "), d.opening_stock, d.deliveries, d.sales, d.closing_stock])
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Consumption</h1>
          <p className="text-slate-500 text-sm mt-1">Stock movement by fuel type</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPdf}><Download className="w-4 h-4 mr-2" />PDF</Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 p-4 bg-white border border-slate-200 rounded-xl">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm" />
        <span className="text-slate-400 self-center">to</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm" />
        <button onClick={fetchData} className="px-4 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">Apply</button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Fuel Type</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Opening (L)</th>
              <th className="text-right px-4 py-3 font-medium text-green-600">Deliveries (L)</th>
              <th className="text-right px-4 py-3 font-medium text-red-600">Sales (L)</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Closing (L)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map(row => (
              <tr key={row.fuel_type} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800 capitalize">{row.fuel_type.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-right text-slate-700">{row.opening_stock.toFixed(3)}</td>
                <td className="px-4 py-3 text-right text-green-600">+{row.deliveries.toFixed(3)}</td>
                <td className="px-4 py-3 text-right text-red-600">-{row.sales.toFixed(3)}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">{row.closing_stock.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
