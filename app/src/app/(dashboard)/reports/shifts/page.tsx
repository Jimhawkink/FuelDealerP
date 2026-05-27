import { createClient } from "@/lib/supabase/server"
export default async function ShiftsReportPage() {
  const supabase = await createClient()
  const { data: shifts } = await supabase.from("fuel_shifts").select("id,started_at,ended_at,status,fuel_users!attendant_id(full_name)").order("started_at",{ascending:false}).limit(50)
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Shift Summary Report</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr>{["Attendant","Started","Ended","Duration","Status"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-50">{(shifts??[]).map((s:any)=>{
          const dur=s.ended_at?Math.round((new Date(s.ended_at).getTime()-new Date(s.started_at).getTime())/(1000*60))+"m":"-"
          return <tr key={s.id}><td className="px-4 py-3 font-medium text-slate-800">{(s.fuel_users as any)?.full_name}</td><td className="px-4 py-3 text-slate-600 text-xs">{new Date(s.started_at).toLocaleString("en-KE")}</td><td className="px-4 py-3 text-slate-600 text-xs">{s.ended_at?new Date(s.ended_at).toLocaleString("en-KE"):"-"}</td><td className="px-4 py-3 text-slate-500">{dur}</td><td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${s.status==="open"?"bg-green-100 text-green-700":"bg-slate-100 text-slate-600"}`}>{s.status}</span></td></tr>
        })}</tbody></table>
      </div>
    </div>
  )
}
