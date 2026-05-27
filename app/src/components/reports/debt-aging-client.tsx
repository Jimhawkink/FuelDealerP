"use client"

import { Button } from "@/components/ui/button"
import { Download, FileSpreadsheet } from "lucide-react"

interface AgingRow {
  id: string
  full_name: string
  outstanding_balance: number
  d0_30: number
  d31_60: number
  d61_90: number
  d90plus: number
}

export function DebtAgingClient({ data }: { data: AgingRow[] }) {
  const totals = data.reduce(
    (acc, row) => ({
      outstanding_balance: acc.outstanding_balance + row.outstanding_balance,
      d0_30: acc.d0_30 + row.d0_30,
      d31_60: acc.d31_60 + row.d31_60,
      d61_90: acc.d61_90 + row.d61_90,
      d90plus: acc.d90plus + row.d90plus,
    }),
    { outstanding_balance: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 }
  )

  const fmt = (n: number) => n > 0 ? `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}` : "—"

  const handleExportPdf = async () => {
    const { exportToPdf } = await import("@/lib/export/pdf-export")
    exportToPdf(
      "Debt Aging Report",
      ["Customer", "0-30 Days", "31-60 Days", "61-90 Days", "90+ Days", "Total"],
      data.map(d => [d.full_name, d.d0_30.toFixed(2), d.d31_60.toFixed(2), d.d61_90.toFixed(2), d.d90plus.toFixed(2), d.outstanding_balance.toFixed(2)])
    )
  }

  const handleExportExcel = async () => {
    const { exportToExcel } = await import("@/lib/export/excel-export")
    await exportToExcel(
      "debt_aging_report",
      "Debt Aging",
      ["Customer", "0-30 Days", "31-60 Days", "61-90 Days", "90+ Days", "Total"],
      data.map(d => [d.full_name, d.d0_30, d.d31_60, d.d61_90, d.d90plus, d.outstanding_balance])
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Debt Aging Report</h1>
          <p className="text-slate-500 text-sm mt-1">{data.length} customers with outstanding balances</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPdf}><Download className="w-4 h-4 mr-2" />PDF</Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</Button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Customer</th>
                <th className="text-right px-4 py-3 font-medium text-green-600">0–30 Days</th>
                <th className="text-right px-4 py-3 font-medium text-yellow-600">31–60 Days</th>
                <th className="text-right px-4 py-3 font-medium text-orange-600">61–90 Days</th>
                <th className="text-right px-4 py-3 font-medium text-red-600">90+ Days</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No outstanding balances</td></tr>
              ) : (
                data.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.full_name}</td>
                    <td className="px-4 py-3 text-right text-green-700">{fmt(row.d0_30)}</td>
                    <td className="px-4 py-3 text-right text-yellow-700">{fmt(row.d31_60)}</td>
                    <td className="px-4 py-3 text-right text-orange-700">{fmt(row.d61_90)}</td>
                    <td className="px-4 py-3 text-right text-red-700">{fmt(row.d90plus)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      KES {row.outstanding_balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
              {data.length > 0 && (
                <tr className="bg-amber-50 font-semibold">
                  <td className="px-4 py-3 text-slate-800">Total</td>
                  <td className="px-4 py-3 text-right text-green-700">{fmt(totals.d0_30)}</td>
                  <td className="px-4 py-3 text-right text-yellow-700">{fmt(totals.d31_60)}</td>
                  <td className="px-4 py-3 text-right text-orange-700">{fmt(totals.d61_90)}</td>
                  <td className="px-4 py-3 text-right text-red-700">{fmt(totals.d90plus)}</td>
                  <td className="px-4 py-3 text-right text-amber-700">KES {totals.outstanding_balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
