import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Plus } from "lucide-react"
export default async function CustomersPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("fuel_customers").select("*").order("full_name")
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <Link href="/customers/new" className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium" style={{background:"linear-gradient(135deg,#F59E0B,#EA580C)"}}><Plus className="w-4 h-4"/>Add Customer</Link>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr>{["Name","Phone","Company","Balance","Credit Limit","Utilisation","Status"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-50">{(data??[]).map((c:any)=>{
          const util = c.credit_limit>0?Math.min((c.outstanding_balance/c.credit_limit)*100,100):0
          return <tr key={c.id} className="hover:bg-slate-50">
            <td className="px-4 py-3"><Link href={`/customers/${c.id}`} className="font-medium text-amber-600 hover:underline">{c.full_name}</Link></td>
            <td className="px-4 py-3 text-slate-600">{c.phone}</td>
            <td className="px-4 py-3 text-slate-500">{c.company_name??"-"}</td>
            <td className="px-4 py-3 font-semibold text-red-600">KES {Number(c.outstanding_balance).toLocaleString()}</td>
            <td className="px-4 py-3 text-slate-600">KES {Number(c.credit_limit).toLocaleString()}</td>
            <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-20 bg-slate-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${util>=90?"bg-red-500":util>=70?"bg-amber-500":"bg-blue-400"}`} style={{width:`${util}%`}}/></div><span className="text-xs text-slate-500">{util.toFixed(0)}%</span></div></td>
            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${c.is_active?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>{c.is_active?"Active":"Inactive"}</span></td>
          </tr>
        })}</tbody></table>
      </div>
    </div>
  )
}
