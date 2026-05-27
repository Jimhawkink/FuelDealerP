"use client"
import { useState, useEffect } from "react"
import { Clock, Play, Square } from "lucide-react"
export default function ShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([])
  const [activeShift, setActiveShift] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => { fetch("/api/shifts").then(r=>r.json()).then(d=>{ setShifts(d.shifts??[]); setActiveShift(d.shifts?.find((s:any)=>s.status==="open")??null) }) }, [])
  const openShift = async () => { setLoading(true); const r = await fetch("/api/shifts",{method:"POST"}); const d = await r.json(); setActiveShift(d.shift); setShifts(p=>[d.shift,...p]); setLoading(false) }
  const closeShift = async () => { if(!activeShift) return; setLoading(true); await fetch(`/api/shifts/${activeShift.id}`,{method:"PATCH"}); setActiveShift(null); fetch("/api/shifts").then(r=>r.json()).then(d=>setShifts(d.shifts??[])); setLoading(false) }
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Shifts</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${activeShift?"bg-green-500 animate-pulse":"bg-slate-300"}`}/>
          <p className="font-medium text-slate-800">{activeShift?`Shift open since ${new Date(activeShift.started_at).toLocaleTimeString("en-KE")}`:"No active shift"}</p>
          {activeShift
            ? <button onClick={closeShift} disabled={loading} className="ml-auto flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium"><Square className="w-4 h-4"/>Close Shift</button>
            : <button onClick={openShift} disabled={loading} className="ml-auto flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium" style={{background:"linear-gradient(135deg,#F59E0B,#EA580C)"}}><Play className="w-4 h-4"/>Open Shift</button>}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-semibold text-slate-800">Shift History</h3></div>
        <table className="w-full text-sm"><thead className="bg-slate-50"><tr>{["Started","Ended","Status"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-50">{shifts.map((s:any)=><tr key={s.id}><td className="px-4 py-3 text-slate-600">{new Date(s.started_at).toLocaleString("en-KE")}</td><td className="px-4 py-3 text-slate-600">{s.ended_at?new Date(s.ended_at).toLocaleString("en-KE"):"-"}</td><td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${s.status==="open"?"bg-green-100 text-green-700":"bg-slate-100 text-slate-600"}`}>{s.status}</span></td></tr>)}</tbody></table>
      </div>
    </div>
  )
}
