"use client"
import { useState } from "react"
import { Loader2, CheckCircle } from "lucide-react"
export default function SmsSettingsPage() {
  const [provider, setProvider] = useState<"africas_talking"|"twilio">("africas_talking")
  const [atForm, setAtForm] = useState({ api_key:"", username:"", sender_id:"" })
  const [twForm, setTwForm] = useState({ account_sid:"", auth_token:"", from_number:"" })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    const credentials = provider==="africas_talking" ? atForm : twForm
    await fetch("/api/settings/sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({provider,...credentials})})
    setSaved(true); setLoading(false)
  }
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">SMS Provider</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Provider</label>
            <div className="flex gap-3">
              {(["africas_talking","twilio"] as const).map(p=>(
                <button key={p} type="button" onClick={()=>setProvider(p)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${provider===p?"bg-amber-500 text-white border-amber-500":"bg-white text-slate-600 border-slate-200"}`}>
                  {p==="africas_talking"?"Africa's Talking":"Twilio"}
                </button>
              ))}
            </div>
          </div>
          {provider==="africas_talking" ? (
            <>
              {[{key:"api_key",label:"API Key"},{key:"username",label:"Username"},{key:"sender_id",label:"Sender ID"}].map(f=>(
                <div key={f.key}><label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                <input value={(atForm as any)[f.key]} onChange={e=>setAtForm(p=>({...p,[f.key]:e.target.value}))} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-amber-400 outline-none"/></div>
              ))}
            </>
          ) : (
            <>
              {[{key:"account_sid",label:"Account SID"},{key:"auth_token",label:"Auth Token"},{key:"from_number",label:"From Number"}].map(f=>(
                <div key={f.key}><label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                <input value={(twForm as any)[f.key]} onChange={e=>setTwForm(p=>({...p,[f.key]:e.target.value}))} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-amber-400 outline-none"/></div>
              ))}
            </>
          )}
          {saved&&<div className="flex items-center gap-2 text-green-600 text-sm"><CheckCircle className="w-4 h-4"/>Saved successfully</div>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2" style={{background:"linear-gradient(135deg,#F59E0B,#EA580C)"}}>
            {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Saving...</>:"Save SMS Config"}
          </button>
        </form>
      </div>
    </div>
  )
}
