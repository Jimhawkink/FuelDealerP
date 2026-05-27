"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Download, FileSpreadsheet } from "lucide-react"

interface ShiftRow {
  id: string
  attendant: string
  started_at: string
  ended_at: string | null
  total_litres: number
  total_kes: number
  transaction_count: number
  channels: string[]
}

export default function ShiftsReportPage() {
  const supabase = createClient()
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]
  })
  const [to, setTo] = useState(new Date().toISOString().split("T")[0])
  const [data, setData] = useState<ShiftRow[]>([])

  const fetchData = useCallback(async () => {
    const { data: shifts } = await supabase
      .from("fuel_shifts")
      .select(`id, started_at, ended_at, fuel_users!fuel_shifts_attendant_id_fkey(full_name)`)
      .gte("started_at", `${from}T00:00:00`)
      .lte("started_at", `${to}T23:59:59`)
      .order("started_at", { ascending: false })

    const rows: ShiftRow[] = await Promise.all(
      (shifts ?? []).map(async (shift: any) => {
        const { data: sales } = await supabase
          .from("fuel_sales")
          .select("quantity_litres, total_amount, payment_channel")
          .eq("shift_id", shift.id)

        const total_litres = (sales ?? []).reduce((s: number, r: any) => s + Number(r.quantity_litres), 0)
        const total_kes = (sales ?? []).reduce((s: number, r: any) => s + Number(r.total_amount), 0)
        const channels = [...new Set((sales ?? []).map((s: any) => s.payment_channel).filter(Boolean))]

        return {
          id: shift.id,
          attendant: shift.fuel_users?.full_name ?? "Unknown",
          started_at: shift.started_at,
          ended_at: shift.ended_at,
          total_litres,
          total_kes,
          transaction_count: (sales ?? []).length,
          channels,
        }
      })
    )

    setData(rows)
  }, [supabase, from, to])

  useEffect(() => { fetchData() }, [fetchData])

  const formatChannel = (ch: string) => ch.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())

  const handleExportPdf = async () => {
    const { exportToPdf } = await import("@/lib/export/pdf-export")
    exportToPdf(
      `Shift Summary ${from} to ${to}`,
      ["Attendant", "Start", "End", "Transactions", "Litres", "Total (KES)", "Channels"],
      data.map(d => [
        d.attendant,
        new Date(d.started_at).toLocaleString("en-KE"),
        d.ended_at ? new Date(d.ended_at).toLocaleString("en-KE") : "Open",
        d.transaction_count,
        d.total_litres.toFixed(3),
        d.total_kes.toFixed(2),
        d.channels.map(formatChannel).join(", "),
      ])
    )
  }

  const handleExportExcel = async () => {
    const { exportToExcel } = await import("@/lib/export/excel-export")
    await exportToExcel(
      `shifts_report_${from}_${to}`,
      "Shifts",
      ["Attendant", "Start", "End", "Transactions", "Litres", "Total (KES)", "Channels"],
      data.map(d => [
        d.attendant,
        new Date(d.started_at).toLocaleString("en-KE"),
        d.ended_at ? new Date(d.ended_at).toLocaleString("en-KE") : "Open",
        d.transaction_count,
        d.total_litres,
        d.total_kes,
        d.channels.map(formatChannel).join(", "),
      ])
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shift Summaries</h1>
          <p className="text-slate-500 text-sm mt-1">Sales per attendant shift</p>
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Attendant</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Start</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">End</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Transactions</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Litres</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Total (KES)</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Channels</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No shifts for selected period</td></tr>
              ) : (
                data.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.attendant}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                      {new Date(row.started_at).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                      {row.ended_at
                        ? new Date(row.ended_at).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                        : <span className="text-green-600 font-medium">Open</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.transaction_count}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.total_litres.toFixed(3)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">KES {row.total_kes.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{row.channels.map(formatChannel).join(", ") || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
