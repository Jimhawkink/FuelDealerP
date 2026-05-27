import { createClient } from "@/lib/supabase/server"
export default async function SalesHistoryPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("fuel_sales").select("*, fuel_customers(full_name), fuel_fuel_types(name), fuel_users!attendant_id(full_name)").order("created_at", { ascending: false }).limit(50)
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Sales History</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>{["Date","Customer","Fuel","Litres","Unit Price","Total","Type","Channel","Attendant"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-50">
            {(data??[]).map((s:any)=>(
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{new Date(s.created_at).toLocaleDateString("en-KE")}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{s.fuel_customers?.full_name}</td>
                <td className="px-4 py-3 text-slate-600 capitalize">{s.fuel_fuel_types?.name?.replace("_"," ")}</td>
                <td className="px-4 py-3 text-slate-600">{Number(s.quantity_litres).toFixed(2)}</td>
                <td className="px-4 py-3 text-slate-600">KES {Number(s.unit_price).toLocaleString()}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">KES {Number(s.total_amount).toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${s.sale_type==="credit"?"bg-orange-100 text-orange-700":"bg-green-100 text-green-700"}`}>{s.sale_type==="credit"?"Credit":"Pay Now"}</span></td>
                <td className="px-4 py-3 text-slate-500 capitalize">{s.payment_channel?.replace(/_/g," ")??"-"}</td>
                <td className="px-4 py-3 text-slate-500">{s.fuel_users?.full_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
