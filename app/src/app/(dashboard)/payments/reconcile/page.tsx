"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { CheckCircle } from "lucide-react"
export default function ReconcilePage() {
  const supabase = createClient()
  const [pending, setPending] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [assignments, setAssignments] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState<Record<string,boolean>>({})
  useEffect(() => {
    supabase.from("fuel_payments").select("*").eq("status","pending").order("created_at",{ascending:false}).then(({data})=>setPending(data??[]))
    supabase.from("fuel_customers").select("id,full_name").eq("is_active",true).order("full_name").then(({data})=>setCustomers(data??[]))
    const ch = supabase.channel("reconcile-queue").on("postgres_changes",{event:"INSERT",schema:"public",table:"fuel_payments"},(p)=>{if(p.new.status==="pending")setPending(prev=>[p.new,...prev])}).subscribe()
    return ()=>{supabase.removeChannel(ch)}
  },[])
  const assign = async (paymentId: string) => {
    const customerId = assignments[paymentId]
    if(!customerId) return
    setLoading(p=>({...p,[paymentId]:true}))
    await fetch("/api/payments/reconcile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({payment_id:paymentId,customer_id:customerId})})
    setPending(p=>p.filter(x=>x.id!==paymentId))
    setLoading(p=>({...p,[paymentId]:false}))
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Pending Reconciliation</h1>
        <span className="bg-orange-100 text-orange-700 text-sm font-semibold px-3 py-1 rounded-full">{pending.length} pending</span>
      </div>
      {pending.length===0&&<div className="bg-white rounded-xl border border-slate-200 p-12 text-center"><CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3"/><p className="text-slate-500">All payments reconciled</p></div>}
      <div className="space-y-3">{pending.map((p:any)=>(
        <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-800">KES {Number(p.amount).toLocaleString()} <span className="text-slate-400 font-normal text-sm">via {p.channel.replace(/_/g," ")}</span></p>
              <p className="text-sm text-slate-500 mt-1">Ref: {p.raw_reference??"-"} | Phone: {p.raw_phone??"-"}</p>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">{p.raw_narration??"-"}</p>
              <p className="text-xs text-slate-400">{new Date(p.created_at).toLocaleString("en-KE")}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <select value={assignments[p.id]??""} onChange={e=>setAssignments(prev=>({...prev,[p.id]:e.target.value}))} className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-amber-400 outline-none">
                <option value="">Select customer...</option>
                {customers.map((c:any)=><option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
              <button onClick={()=>assign(p.id)} disabled={!assignments[p.id]||loading[p.id]} className="px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50" style={{background:"linear-gradient(135deg,#F59E0B,#EA580C)"}}>
                {loading[p.id]?"...":"Assign"}
              </button>
            </div>
          </div>
        </div>
      ))}</div>
    </div>
  )
}
