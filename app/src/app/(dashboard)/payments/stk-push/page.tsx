"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Smartphone } from "lucide-react"
export default function StkPushPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<any[]>([])
  const [form, setForm] = useState({ customer_id:"", amount:"" })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")
  useEffect(()=>{ supabase.from("fuel_customers").select("id,full_name,phone").eq("is_active",true).order("full_name").then(({data})=>setCustomers(data??[])) },[])
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setResult("")
    const res = await fetch("/api/payments/stk-push",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,amount:parseFloat(form.amount)})})
    const data = await res.json()
    setResult(res.ok?`STK Push sent! Request ID: ${data.checkoutRequestId}`:data.error)
    setLoading(false)
  }
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Initiate STK Push</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
            <select value={form.customer_id} onChange={e=>setForm(p=>({...p,customer_id:e.target.value}))} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-amber-400 outline-none">
              <option value="">Select customer...</option>{customers.map((c:any)=><option key={c.id} value={c.id}>{c.full_name}  {c.phone}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Amount (KES)</label>
            <input type="number" min="1" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-amber-400 outline-none"/></div>
          {result&&<p className={`text-sm ${result.includes("sent")?"text-green-600":"text-red-500"}`}>{result}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2" style={{background:"linear-gradient(135deg,#F59E0B,#EA580C)"}}>
            {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Sending...</>:<><Smartphone className="w-4 h-4"/>Send STK Push</>}
          </button>
        </form>
      </div>
    </div>
  )
}
