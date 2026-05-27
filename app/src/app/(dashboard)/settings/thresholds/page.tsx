import { createClient } from "@/lib/supabase/server"
export default async function ThresholdsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("fuel_fuel_types").select("id,name,low_stock_threshold_litres,current_price_per_litre").order("name")
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Low-Stock Thresholds</h1>
      <p className="text-slate-500 text-sm">When stock falls below these thresholds, a warning banner appears on the dashboard and an SMS alert is sent.</p>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>{["Fuel Type","Alert Threshold (Litres)"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-50">
            {(data??[]).map((f:any)=>(
              <tr key={f.id}>
                <td className="px-4 py-3 font-medium text-slate-800 capitalize">{f.name.replace("_"," ")}</td>
                <td className="px-4 py-3 font-semibold text-amber-600">{Number(f.low_stock_threshold_litres).toLocaleString()} L</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
