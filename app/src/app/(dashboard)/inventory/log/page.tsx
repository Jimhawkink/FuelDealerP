import { createClient } from "@/lib/supabase/server"
export default async function InventoryLogPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("fuel_inventory_log").select("*, fuel_fuel_types(name)").order("created_at",{ascending:false}).limit(100)
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Inventory Log</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr>{["Date","Fuel Type","Change","Balance","Event"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-50">{(data??[]).map((r:any)=>(
          <tr key={r.id} className="hover:bg-slate-50">
            <td className="px-4 py-3 text-slate-500 text-xs">{new Date(r.created_at).toLocaleString("en-KE")}</td>
            <td className="px-4 py-3 font-medium text-slate-800 capitalize">{r.fuel_fuel_types?.name?.replace("_"," ")}</td>
            <td className={`px-4 py-3 font-semibold ${Number(r.quantity_change)>0?"text-green-600":"text-red-600"}`}>{Number(r.quantity_change)>0?"+":""}{Number(r.quantity_change).toFixed(2)} L</td>
            <td className="px-4 py-3 text-slate-600">{Number(r.resulting_balance).toFixed(2)} L</td>
            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${r.event_type==="delivery"?"bg-green-100 text-green-700":r.event_type==="sale"?"bg-blue-100 text-blue-700":"bg-slate-100 text-slate-600"}`}>{r.event_type}</span></td>
          </tr>
        ))}</tbody></table>
      </div>
    </div>
  )
}
