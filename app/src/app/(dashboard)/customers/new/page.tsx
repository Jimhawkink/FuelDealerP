"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
export default function NewCustomerPage() {
  const router = useRouter()
  const [form, setForm] = useState({ full_name:"", phone:"", email:"", company_name:"", credit_limit:"0" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("")
    const res = await fetch("/api/customers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,credit_limit:parseFloat(form.credit_limit)})})
    const data = await res.json()
    if(!res.ok){setError(data.error);setLoading(false);return}
    router.push("/dashboard/customers")
  }
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Add Customer</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {[{label:"Full Name",key:"full_name",type:"text",required:true},{label:"Phone",key:"phone",type:"tel",required:true},{label:"Email",key:"email",type:"email",required:false},{label:"Company Name",key:"company_name",type:"text",required:false},{label:"Credit Limit (KES)",key:"credit_limit",type:"number",required:true}].map(f=>(
            <div key={f.key}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} required={f.required} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-amber-400 outline-none"/>
            </div>
          ))}
          {error&&<p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2" style={{background:"linear-gradient(135deg,#F59E0B,#EA580C)"}}>
            {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Saving...</>:"Save Customer"}
          </button>
        </form>
      </div>
    </div>
  )
}
