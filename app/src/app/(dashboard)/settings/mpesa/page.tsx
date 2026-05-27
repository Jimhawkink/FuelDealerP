"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle2, CreditCard, Loader2 } from "lucide-react"

export default function MpesaSettingsPage() {
  const [form, setForm] = useState({
    consumer_key: "",
    consumer_secret: "",
    paybill_number: "",
    passkey: "",
    callback_url: "",
    environment: "sandbox",
  })
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/settings/mpesa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? "Failed to save")
      else setSuccess("M-Pesa settings saved successfully")
    } catch { setError("Network error") }
    finally { setLoading(false) }
  }

  const handleTestConnection = async () => {
    setTestLoading(true)
    setError(null)
    try {
      const baseUrl = form.environment === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke"
      const credentials = btoa(`${form.consumer_key}:${form.consumer_secret}`)
      const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${credentials}` },
      })
      if (res.ok) setSuccess("Connection successful! OAuth token obtained.")
      else setError(`Connection failed: ${res.status} ${res.statusText}`)
    } catch { setError("Connection test failed. Check credentials.") }
    finally { setTestLoading(false) }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">M-Pesa Configuration</h1>
        <p className="text-slate-500 text-sm mt-1">Daraja API credentials</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="w-4 h-4 text-green-500" />
            Daraja API Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Environment</Label>
              <Select value={form.environment} onValueChange={v => setForm(f => ({ ...f, environment: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Consumer Key</Label>
              <Input type="password" value={form.consumer_key} onChange={e => setForm(f => ({ ...f, consumer_key: e.target.value }))} placeholder="••••••••" required />
            </div>

            <div className="space-y-1.5">
              <Label>Consumer Secret</Label>
              <Input type="password" value={form.consumer_secret} onChange={e => setForm(f => ({ ...f, consumer_secret: e.target.value }))} placeholder="••••••••" required />
            </div>

            <div className="space-y-1.5">
              <Label>Paybill / Till Number</Label>
              <Input value={form.paybill_number} onChange={e => setForm(f => ({ ...f, paybill_number: e.target.value }))} placeholder="174379" required />
            </div>

            <div className="space-y-1.5">
              <Label>Passkey</Label>
              <Input type="password" value={form.passkey} onChange={e => setForm(f => ({ ...f, passkey: e.target.value }))} placeholder="••••••••" required />
            </div>

            <div className="space-y-1.5">
              <Label>Callback URL (optional)</Label>
              <Input type="url" value={form.callback_url} onChange={e => setForm(f => ({ ...f, callback_url: e.target.value }))} placeholder="https://your-domain.com/api/mpesa/callback" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleTestConnection} disabled={testLoading || !form.consumer_key || !form.consumer_secret} className="flex-1">
                {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test Connection"}
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
