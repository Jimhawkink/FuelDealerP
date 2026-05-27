"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Button } from "@/components/ui/button"
import { Download, FileSpreadsheet } from "lucide-react"

interface SalesData {
  fuel_type: string
  total_litres: number
  total_kes: number
}

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 7 Days", days: 7 },
  { label: "Last 30 Days", days: 30 },
  { label: "Last 90 Days", days: 90 },
]

export default function SalesReportPage() {
  const supabase = createClient()
  const [from, setFrom] = useState(new Date().toISOString().split("T")[0])
  const [to, setTo] = useState(new Date().toISOString().split("T")[0])
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("fuel_sales")
      .select("quantity_litres, total_amount, fuel_fuel_types!fuel_sales_fuel_type_id_fkey(name)")
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)

    const grouped: Record<string, SalesData> = {}
    for (const sale of data ?? []) {
      const name = (sale as any).fuel_fuel_types?.name ?? "Unknown"
      if (!grouped[name]) grouped[name] = { fuel_type: name, total_litres: 0, total_kes: 0 }
      grouped[name].total_litres += Number((sale as any).quantity_litres)
      grouped[name].total_kes += Number((sale as any).total_amount)
    }
    setSalesData(Object.values(grouped))
    setLoading(false)
  }, [supabase, from, to])

  useEffect(() => { fetchData() }, [fetchData])

  const applyPreset = (days: number) => {
    const end = new Date()
    const start = new Date()
    if (days > 0) start.setDate(start.getDate() - days)
    setFrom(start.toISOString().split("T")[0])
    setTo(end.toISOString().split("T")[0])
  }

  const handleExportPdf = async () => {
    const { exportToPdf } = await import("@/lib/export/pdf-export")
    exportToPdf(
      `Sales Report ${from} to ${to}`,
      ["Fuel Type", "Litres Sold", "Total (KES)"],
      salesData.map(d => [
        d.fuel_type.replace(/_/g, " "),
        d.total_litres.toFixed(3),
        d.total_kes.toFixed(2),
      ])
    )
  }

  const handleExportExcel = async () => {
    const { exportToExcel } = await import("@/lib/export/excel-export")
    await exportToExcel(
      `sales_report_${from}_${to}`,
      "Sales",
      ["Fuel Type", "Litres Sold", "Total (KES)"],
      salesData.map(d => [
        d.fuel_type.replace(/_/g, " "),
        d.total_litres,
        d.total_kes,
      ])
    )
  }

  const totalLitres = salesData.reduce((s, d) => s + d.total_litres, 0)
  const totalKes = salesData.reduce((s, d) => s + d.total_kes, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales Report</h1>
          <p className="text-slate-500 text-sm mt-1">Fuel sales by type</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download className="w-4 h-4 mr-2" />PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />Excel
          </Button>
        </div>
      </div>

      {/* Date range */}
      <div className="flex flex-wrap gap-3 p-4 bg-white border border-slate-200 rounded-xl">
        <div className="flex gap-2">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p.days)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-amber-50 hover:border-amber-300">
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm" />
          <span className="text-slate-400">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm" />
          <button onClick={fetchData} className="px-4 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">Apply</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-500">Total Litres Sold</p>
          <p className="text-2xl font-bold text-slate-800">{totalLitres.toLocaleString("en-KE", { minimumFractionDigits: 3 })} L</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-500">Total Revenue</p>
          <p className="text-2xl font-bold text-amber-600">KES {totalKes.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Chart */}
      {salesData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="font-medium text-slate-700 mb-4">Sales by Fuel Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="fuel_type" tick={{ fontSize: 12 }} tickFormatter={v => v.replace(/_/g, " ")} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value, name) => [
                name === "total_litres" ? `${Number(value).toFixed(3)} L` : `KES ${Number(value).toLocaleString()}`,
                name === "total_litres" ? "Litres" : "Revenue (KES)"
              ]} />
              <Legend />
              <Bar yAxisId="left" dataKey="total_litres" name="Litres" fill="#f59e0b" />
              <Bar yAxisId="right" dataKey="total_kes" name="Revenue (KES)" fill="#0f172a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Fuel Type</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Litres Sold</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Total (KES)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {salesData.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">No sales data for selected period</td></tr>
            ) : (
              salesData.map(d => (
                <tr key={d.fuel_type} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800 capitalize">{d.fuel_type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{d.total_litres.toFixed(3)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">KES {d.total_kes.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
                </tr>
              ))
            )}
            {salesData.length > 0 && (
              <tr className="bg-amber-50 font-semibold">
                <td className="px-4 py-3 text-slate-800">Total</td>
                <td className="px-4 py-3 text-right text-slate-800">{totalLitres.toFixed(3)}</td>
                <td className="px-4 py-3 text-right text-amber-700">KES {totalKes.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
