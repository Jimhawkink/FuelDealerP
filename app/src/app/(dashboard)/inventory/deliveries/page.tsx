"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
export default function DeliveriesPage() {
  const supabase = createClient()
  const [fuelTypes, setFuelTypes] = useState<any[]>([])
  const [form, setForm] = useState({ fuel_type_id:"", quantity_litres:"", delivery_date:new Date().toISOString().split("T")[0], supplier_reference:"" })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  useEffect(()=>{ supabase.from("fuel_fuel_types").select("id,name").then(({data})=>setFuelTypes(data??[])) },[])
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(""); setSuccess("")
    const res = await fetch("/api/inventory/delivery",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,quantity_litres:parseFloat(form.quantity_litres)})})
    const data = await res.json()
    if(!res.ok){setError(data.error);setLoading(false);return}
    setSuccess(`Delivery recorded. New stock: ${data.new_stock.toFixed(1)} L`)
    setForm(p=>({...p,quantity_litres:"",supplier_reference:""}))
    setLoading(false)
  }
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Record Fuel Delivery</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Fuel Type</label>
            <select value={form.fuel_type_id} onChange={e=>setForm(p=>({...p,fuel_type_id:e.target.value}))} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-amber-400 outline-none">
              <option value="">Select...</option>{fuelTypes.map((f:any)=><option key={f.id} value={f.id}>{f.name.replace("_"," ")}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Quantity (Litres)</label>
            <input type="number" step="0.001" min="0.001" value={form.quantity_litres} onChange={e=>setForm(p=>({...p,quantity_litres:e.target.value}))} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-amber-400 outline-none"/></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Delivery Date</label>
            <input type="date" value={form.delivery_date} onChange={e=>setForm(p=>({...p,delivery_date:e.target.value}))} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-amber-400 outline-none"/></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Supplier Reference</label>
            <input type="text" value={form.supplier_reference} onChange={e=>setForm(p=>({...p,supplier_reference:e.target.value}))} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-amber-400 outline-none"/></div>
          {error&&<p className="text-red-500 text-sm">{error}</p>}
          {success&&<p className="text-green-600 text-sm">{success}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2" style={{background:"linear-gradient(135deg,#F59E0B,#EA580C)"}}>
            {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Saving...</>:"Record Delivery"}
          </button>
        </form>
      </div>
    </div>
  )
}
