import { createClient } from "@/lib/supabase/server"
export default async function FuelPricesPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("fuel_fuel_types").select("*").order("name")
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Fuel Prices</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>{["Fuel Type","Current Price (KES/L)","Low Stock Threshold (L)"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-50">
            {(data??[]).map((f:any)=>(
              <tr key={f.id}>
                <td className="px-4 py-3 font-medium text-slate-800 capitalize">{f.name.replace("_"," ")}</td>
                <td className="px-4 py-3 font-semibold text-amber-600">KES {Number(f.current_price_per_litre).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-600">{Number(f.low_stock_threshold_litres).toLocaleString()} L</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-slate-500">To update prices, use the API endpoint PATCH /api/settings/fuel-prices or contact your system administrator.</p>
    </div>
  )
}
