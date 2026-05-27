import { createClient } from "@/lib/supabase/server"
export default async function InventoryReportPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("fuel_inventory").select("stock_litres, fuel_fuel_types(name,low_stock_threshold_litres)")
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Inventory Report</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr>{["Fuel Type","Current Stock","Threshold","Status"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-50">{(data??[]).map((r:any)=>{
          const low=r.stock_litres<r.fuel_fuel_types?.low_stock_threshold_litres
          return <tr key={r.fuel_fuel_types?.name}><td className="px-4 py-3 font-medium text-slate-800 capitalize">{r.fuel_fuel_types?.name?.replace("_"," ")}</td><td className="px-4 py-3 text-slate-600">{Number(r.stock_litres).toFixed(2)} L</td><td className="px-4 py-3 text-slate-500">{r.fuel_fuel_types?.low_stock_threshold_litres} L</td><td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${low?"bg-red-100 text-red-700":"bg-green-100 text-green-700"}`}>{low?"Low Stock":"OK"}</span></td></tr>
        })}</tbody></table>
      </div>
    </div>
  )
}
