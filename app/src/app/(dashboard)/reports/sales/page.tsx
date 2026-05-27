import { createClient } from "@/lib/supabase/server"
export default async function SalesReportPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]
  const { data } = await supabase.from("fuel_sales").select("total_amount, quantity_litres, fuel_fuel_types(name), created_at").gte("created_at",`${today}T00:00:00`).lte("created_at",`${today}T23:59:59`)
  const byType: Record<string,{litres:number,kes:number}> = {}
  ;(data??[]).forEach((s:any)=>{ const n=s.fuel_fuel_types?.name??"unknown"; if(!byType[n])byType[n]={litres:0,kes:0}; byType[n].litres+=Number(s.quantity_litres); byType[n].kes+=Number(s.total_amount) })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Sales Report — Today</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr>{["Fuel Type","Litres Sold","KES Collected"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-50">{Object.entries(byType).map(([name,v])=>(
          <tr key={name}><td className="px-4 py-3 font-medium text-slate-800 capitalize">{name.replace("_"," ")}</td><td className="px-4 py-3 text-slate-600">{v.litres.toFixed(2)} L</td><td className="px-4 py-3 font-semibold text-green-600">KES {v.kes.toLocaleString()}</td></tr>
        ))}</tbody></table>
      </div>
    </div>
  )
}
