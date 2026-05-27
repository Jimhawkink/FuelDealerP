"use client"
import { useState } from "react"
import { Upload, FileText } from "lucide-react"
export default function ImportPage() {
  const [file, setFile] = useState<File|null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if(!file) return; setLoading(true)
    const fd = new FormData(); fd.append("file", file)
    const res = await fetch("/api/payments/import",{method:"POST",body:fd})
    const data = await res.json()
    setResult(data); setLoading(false)
  }
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Import Bank Statement</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file?"border-amber-400 bg-amber-50":"border-slate-200 hover:border-amber-300"}`}>
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3"/>
            <p className="text-sm text-slate-600 mb-2">{file?file.name:"Drop CSV or Excel file here"}</p>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={e=>setFile(e.target.files?.[0]??null)} className="hidden" id="file-input"/>
            <label htmlFor="file-input" className="text-sm text-amber-600 font-medium cursor-pointer hover:underline">Browse files</label>
          </div>
          {result&&(
            <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
              <p className="font-semibold text-slate-800">Import Summary</p>
              <p className="text-slate-600">Total rows: {result.total_rows}</p>
              <p className="text-green-600">Parsed: {result.parsed_rows}</p>
              {result.error_rows>0&&<p className="text-red-500">Errors: {result.error_rows}</p>}
            </div>
          )}
          <button type="submit" disabled={!file||loading} className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60" style={{background:"linear-gradient(135deg,#F59E0B,#EA580C)"}}>
            {loading?"Processing...":"Import Statement"}
          </button>
        </form>
      </div>
    </div>
  )
}
