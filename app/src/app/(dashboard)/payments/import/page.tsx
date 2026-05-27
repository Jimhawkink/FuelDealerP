"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle2, FileUp, Loader2, Upload } from "lucide-react"

const BANKS = ["KCB", "Equity", "Co-op", "NCBA", "Absa", "Standard Chartered", "DTB", "Family Bank"]

interface ParseSummary {
  import_id: string
  bank_name: string
  total_rows: number
  parsed_rows: number
  error_rows: number
  parse_errors: Array<{ row: number; reason: string }>
}

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [bankName, setBankName] = useState("")
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ParseSummary | null>(null)
  const [progress, setProgress] = useState(0)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) validateAndSetFile(dropped)
  }

  const validateAndSetFile = (f: File) => {
    if (!f.name.match(/\.(csv|xlsx|xls)$/i)) {
      setError("Only CSV and Excel (.xlsx, .xls) files are accepted")
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB")
      return
    }
    setFile(f)
    setError(null)
    setSummary(null)
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setSummary(null)
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append("file", file)
      if (bankName) formData.append("bank_name", bankName)

      setProgress(30)
      const res = await fetch("/api/payments/import", {
        method: "POST",
        body: formData,
      })
      setProgress(80)

      const data = await res.json()
      setProgress(100)

      if (!res.ok) {
        setError(data.error ?? "Import failed")
      } else {
        setSummary(data)
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import Bank Statement</h1>
        <p className="text-slate-500 text-sm mt-1">Upload CSV or Excel bank statements to import transactions</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="w-4 h-4 text-amber-500" />
            Upload Statement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragging ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:border-amber-300 hover:bg-slate-50"
            }`}
          >
            <FileUp className={`w-8 h-8 mx-auto mb-3 ${dragging ? "text-amber-500" : "text-slate-300"}`} />
            {file ? (
              <div>
                <p className="font-medium text-slate-700">{file.name}</p>
                <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-slate-600">Drop file here or click to browse</p>
                <p className="text-sm text-slate-400 mt-1">CSV or Excel (.xlsx), max 10MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) validateAndSetFile(f) }}
            />
          </div>

          {/* Bank selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Bank (auto-detected or select manually)</label>
            <Select value={bankName} onValueChange={setBankName}>
              <SelectTrigger>
                <SelectValue placeholder="Auto-detect bank format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Auto-detect</SelectItem>
                {BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Progress bar */}
          {loading && progress > 0 && (
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</> : "Import Statement"}
          </Button>
        </CardContent>
      </Card>

      {/* Parse Summary */}
      {summary && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              Import Complete — {summary.bank_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-800">{summary.total_rows}</p>
                <p className="text-xs text-slate-500">Total Rows</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{summary.parsed_rows}</p>
                <p className="text-xs text-slate-500">Parsed</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{summary.error_rows}</p>
                <p className="text-xs text-slate-500">Errors</p>
              </div>
            </div>

            {summary.parse_errors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Parse Errors:</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {summary.parse_errors.map((e, i) => (
                    <div key={i} className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded">
                      Row {e.row}: {e.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm text-slate-500">
              Credit transactions have been queued for auto-reconciliation.
              Check the <a href="/dashboard/payments/reconcile" className="text-amber-600 underline">Reconciliation Queue</a> for unmatched payments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
