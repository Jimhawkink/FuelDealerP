import { createClient } from "@/lib/supabase/server"
export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("fuel_payments").select("*, fuel_customers(full_name)").order("created_at",{ascending:false}).limit(100)
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr>{["Date","Customer","Amount","Channel","Status","Reference"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-50">{(data??[]).map((p:any)=>(
          <tr key={p.id} className="hover:bg-slate-50">
            <td className="px-4 py-3 text-slate-600">{new Date(p.created_at).toLocaleDateString("en-KE")}</td>
            <td className="px-4 py-3 font-medium text-slate-800">{p.fuel_customers?.full_name??<span className="text-slate-400 italic">Unmatched</span>}</td>
            <td className="px-4 py-3 font-semibold text-green-600">KES {Number(p.amount).toLocaleString()}</td>
            <td className="px-4 py-3 text-slate-500 capitalize">{p.channel.replace(/_/g," ")}</td>
            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${p.status==="reconciled"?"bg-green-100 text-green-700":"bg-orange-100 text-orange-700"}`}>{p.status}</span></td>
            <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-xs">{p.raw_reference??"-"}</td>
          </tr>
        ))}</tbody></table>
      </div>
    </div>
  )
}
