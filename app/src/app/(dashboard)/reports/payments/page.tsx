import { createClient } from "@/lib/supabase/server"
export default async function PaymentsReportPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]
  const { data } = await supabase.from("fuel_payments").select("amount,channel").eq("status","reconciled").gte("created_at",`${today}T00:00:00`)
  const byChannel: Record<string,number> = {}
  ;(data??[]).forEach((p:any)=>{ byChannel[p.channel]=(byChannel[p.channel]??0)+Number(p.amount) })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Payments Report  Today</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr>{["Channel","Amount Received"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-50">{Object.entries(byChannel).map(([ch,amt])=>(
          <tr key={ch}><td className="px-4 py-3 font-medium text-slate-800 capitalize">{ch.replace(/_/g," ")}</td><td className="px-4 py-3 font-semibold text-green-600">KES {amt.toLocaleString()}</td></tr>
        ))}</tbody></table>
      </div>
    </div>
  )
}
