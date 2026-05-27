"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Loader2, MessageSquare } from "lucide-react"

type Provider = "africas_talking" | "twilio"

export default function SmsSettingsPage() {
  const [provider, setProvider] = useState<Provider>("africas_talking")
  const [atForm, setAtForm] = useState({ api_key: "", username: "", sender_id: "AlphaFuel" })
  const [twilioForm, setTwilioForm] = useState({ account_sid: "", auth_token: "", from_number: "" })
  const [testPhone, setTestPhone] = useState("")
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
      const body = provider === "africas_talking"
        ? { provider, ...atForm }
        : { provider, ...twilioForm }

      const res = await fetch("/api/settings/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? "Failed to save")
      else setSuccess("SMS settings saved successfully")
    } catch { setError("Network error") }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">SMS Provider</h1>
        <p className="text-slate-500 text-sm mt-1">Configure SMS notifications</p>
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
            <MessageSquare className="w-4 h-4 text-blue-500" />
            SMS Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Provider selector */}
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setProvider("africas_talking")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-all ${provider === "africas_talking" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"}`}>
                  Africa&apos;s Talking
                </button>
                <button type="button" onClick={() => setProvider("twilio")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-all ${provider === "twilio" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"}`}>
                  Twilio
                </button>
              </div>
            </div>

            {/* Africa's Talking fields */}
            {provider === "africas_talking" && (
              <>
                <div className="space-y-1.5">
                  <Label>API Key</Label>
                  <Input type="password" value={atForm.api_key} onChange={e => setAtForm(f => ({ ...f, api_key: e.target.value }))} placeholder="••••••••" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Username</Label>
                  <Input value={atForm.username} onChange={e => setAtForm(f => ({ ...f, username: e.target.value }))} placeholder="sandbox or your username" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Sender ID</Label>
                  <Input value={atForm.sender_id} onChange={e => setAtForm(f => ({ ...f, sender_id: e.target.value }))} placeholder="AlphaFuel" />
                </div>
              </>
            )}

            {/* Twilio fields */}
            {provider === "twilio" && (
              <>
                <div className="space-y-1.5">
                  <Label>Account SID</Label>
                  <Input type="password" value={twilioForm.account_sid} onChange={e => setTwilioForm(f => ({ ...f, account_sid: e.target.value }))} placeholder="AC••••••••" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Auth Token</Label>
                  <Input type="password" value={twilioForm.auth_token} onChange={e => setTwilioForm(f => ({ ...f, auth_token: e.target.value }))} placeholder="••••••••" required />
                </div>
                <div className="space-y-1.5">
                  <Label>From Number</Label>
                  <Input value={twilioForm.from_number} onChange={e => setTwilioForm(f => ({ ...f, from_number: e.target.value }))} placeholder="+1234567890" required />
                </div>
              </>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
