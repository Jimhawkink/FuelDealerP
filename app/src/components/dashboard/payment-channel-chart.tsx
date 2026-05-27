"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface ChannelData {
  channel: string
  amount: number
}

interface PaymentChannelChartProps {
  data: ChannelData[]
}

const CHANNEL_COLORS: Record<string, string> = {
  mpesa_paybill: "#10B981",
  mpesa_till: "#3B82F6",
  mpesa_stk: "#8B5CF6",
  pesalink: "#F59E0B",
  eft_rtgs: "#EF4444",
  bank_deposit: "#06B6D4",
  cash: "#6B7280",
}

const CHANNEL_LABELS: Record<string, string> = {
  mpesa_paybill: "Paybill",
  mpesa_till: "Till",
  mpesa_stk: "STK Push",
  pesalink: "PesaLink",
  eft_rtgs: "EFT/RTGS",
  bank_deposit: "Bank Dep.",
  cash: "Cash",
}

export function PaymentChannelChart({ data }: PaymentChannelChartProps) {
  const chartData = data.map((d) => ({
    name: CHANNEL_LABELS[d.channel] ?? d.channel,
    amount: d.amount,
    channel: d.channel,
  }))

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Payment Channels Today</h3>
        <p className="text-slate-400 text-sm text-center py-8">No payments today</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 mb-4">Payment Channels Today</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
          <Tooltip
            formatter={(value: number) => [`KES ${value.toLocaleString()}`, "Amount"]}
            contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px" }}
          />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.channel} fill={CHANNEL_COLORS[entry.channel] ?? "#6B7280"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
