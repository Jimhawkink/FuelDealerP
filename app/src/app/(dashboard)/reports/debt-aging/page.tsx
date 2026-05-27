import { createClient } from "@/lib/supabase/server"
export default async function DebtAgingPage() {
  const supabase = await createClient()
  const { data: customers } = await supabase.from("fuel_customers").select("id,full_name,outstanding_balance").gt("outstanding_balance",0).order("outstanding_balance",{ascending:false})
  const { data: sales } = await supabase.from("fuel_sales").select("customer_id,total_amount,created_at").eq("sale_type","credit")
  const now = Date.now()
  const aging = (customers??[]).map((c:any)=>{
    const cs = (sales??[]).filter((s:any)=>s.customer_id===c.id)
    const buckets = {d30:0,d60:0,d90:0,d90plus:0}
    cs.forEach((s:any)=>{
      const days = (now-new Date(s.created_at).getTime())/(1000*60*60*24)
      if(days<=30) buckets.d30+=Number(s.total_amount)
      else if(days<=60) buckets.d60+=Number(s.total_amount)
      else if(days<=90) buckets.d90+=Number(s.total_amount)
      else buckets.d90plus+=Number(s.total_amount)
    })
    return {...c,...buckets}
  })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Debt Aging Report</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr>{["Customer","0-30 Days","31-60 Days","61-90 Days","90+ Days","Total"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-50">{aging.map((c:any)=>(
          <tr key={c.id} className="hover:bg-slate-50">
            <td className="px-4 py-3 font-medium text-slate-800">{c.full_name}</td>
            <td className="px-4 py-3 text-green-600">KES {c.d30.toLocaleString()}</td>
            <td className="px-4 py-3 text-amber-600">KES {c.d60.toLocaleString()}</td>
            <td className="px-4 py-3 text-orange-600">KES {c.d90.toLocaleString()}</td>
            <td className="px-4 py-3 text-red-600">KES {c.d90plus.toLocaleString()}</td>
            <td className="px-4 py-3 font-bold text-slate-800">KES {Number(c.outstanding_balance).toLocaleString()}</td>
          </tr>
        ))}</tbody></table>
      </div>
    </div>
  )
}
