"use client"
import { useState } from "react"
import { Loader2, CheckCircle } from "lucide-react"
export default function MpesaSettingsPage() {
  const [form, setForm] = useState({ consumer_key:"", consumer_secret:"", paybill_number:"", passkey:"", callback_url:"" })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("")
    const res = await fetch("/api/settings/mpesa",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)})
    const data = await res.json()
    if(!res.ok){setError(data.error);setLoading(false);return}
    setSaved(true); setLoading(false)
  }
  const fields = [
    {key:"consumer_key",label:"Consumer Key",type:"text"},
    {key:"consumer_secret",label:"Consumer Secret",type:"password"},
    {key:"paybill_number",label:"Paybill / Till Number",type:"text"},
    {key:"passkey",label:"Passkey",type:"password"},
    {key:"callback_url",label:"Callback URL",type:"url"},
  ]
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">M-Pesa Configuration</h1>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">Credentials are stored securely in Supabase Vault and never exposed to the browser.</div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(f=>(
            <div key={f.key}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-amber-400 outline-none" placeholder={f.type==="password"?"":""}/>
            </div>
          ))}
          {error&&<p className="text-red-500 text-sm">{error}</p>}
          {saved&&<div className="flex items-center gap-2 text-green-600 text-sm"><CheckCircle className="w-4 h-4"/>Saved successfully</div>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2" style={{background:"linear-gradient(135deg,#F59E0B,#EA580C)"}}>
            {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Saving...</>:"Save M-Pesa Config"}
          </button>
        </form>
      </div>
    </div>
  )
}
