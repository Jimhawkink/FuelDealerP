"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Button } from "@/components/ui/button"
import { Download, FileSpreadsheet } from "lucide-react"

const COLORS = ["#f59e0b", "#0f172a", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#f97316"]

export default function PaymentsReportPage() {
  const supabase = createClient()
  const [from, setFrom] = useState(new Date().toISOString().split("T")[0])
  const [to, setTo] = useState(new Date().toISOString().split("T")[0])
  const [channelData, setChannelData] = useState<Array<{ channel: string; amount: number; count: number }>>([])

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("fuel_payments")
      .select("channel, amount")
      .eq("status", "reconciled")
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)

    const grouped: Record<string, { amount: number; count: number }> = {}
    for (const p of data ?? []) {
      if (!grouped[p.channel]) grouped[p.channel] = { amount: 0, count: 0 }
      grouped[p.channel].amount += Number(p.amount)
      grouped[p.channel].count++
    }
    setChannelData(Object.entries(grouped).map(([channel, v]) => ({ channel, ...v })))
  }, [supabase, from, to])

  useEffect(() => { fetchData() }, [fetchData])

  const formatChannel = (ch: string) => ch.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
  const total = channelData.reduce((s, d) => s + d.amount, 0)

  const handleExportPdf = async () => {
    const { exportToPdf } = await import("@/lib/export/pdf-export")
    exportToPdf(
      `Payments by Channel ${from} to ${to}`,
      ["Channel", "Count", "Amount (KES)", "% of Total"],
      channelData.map(d => [
        formatChannel(d.channel),
        d.count,
        d.amount.toFixed(2),
        total > 0 ? `${((d.amount / total) * 100).toFixed(1)}%` : "0%",
      ])
    )
  }

  const handleExportExcel = async () => {
    const { exportToExcel } = await import("@/lib/export/excel-export")
    await exportToExcel(
      `payments_by_channel_${from}_${to}`,
      "Payments",
      ["Channel", "Count", "Amount (KES)", "% of Total"],
      channelData.map(d => [
        formatChannel(d.channel),
        d.count,
        d.amount,
        total > 0 ? `${((d.amount / total) * 100).toFixed(1)}%` : "0%",
      ])
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments by Channel</h1>
          <p className="text-slate-500 text-sm mt-1">Payment collection breakdown</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {channelData.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="font-medium text-slate-700 mb-4">Channel Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={channelData} dataKey="amount" nameKey="channel" cx="50%" cy="50%" outerRadius={100}
                  label={({ channel, percent }) => `${formatChannel(channel)} ${(percent * 100).toFixed(0)}%`}>
                  {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `KES ${Number(v).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Channel</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Count</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Amount (KES)</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {channelData.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No payments for selected period</td></tr>
              ) : (
                channelData.map(d => (
                  <tr key={d.channel} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{formatChannel(d.channel)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{d.count}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">KES {d.amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{total > 0 ? `${((d.amount / total) * 100).toFixed(1)}%` : "0%"}</td>
                  </tr>
                ))
              )}
              {channelData.length > 0 && (
                <tr className="bg-amber-50 font-semibold">
                  <td className="px-4 py-3 text-slate-800">Total</td>
                  <td className="px-4 py-3 text-right text-slate-800">{channelData.reduce((s, d) => s + d.count, 0)}</td>
                  <td className="px-4 py-3 text-right text-amber-700">KES {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right text-slate-500">100%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
