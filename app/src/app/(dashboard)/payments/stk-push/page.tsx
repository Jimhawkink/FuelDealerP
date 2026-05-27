"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Clock, Loader2, Smartphone } from "lucide-react"

interface Customer {
  id: string
  full_name: string
  phone: string
  outstanding_balance: number
}

export default function StkPushPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [amount, setAmount] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
  const [stkStatus, setStkStatus] = useState<"pending" | "success" | "failed" | "cancelled" | null>(null)

  useEffect(() => {
    supabase.from("fuel_customers")
      .select("id, full_name, phone, outstanding_balance")
      .eq("is_active", true)
      .order("full_name")
      .then(({ data }) => setCustomers(data ?? []))
  }, [supabase])

  const selectedCustomer = customers.find(c => c.id === customerId)

  // Auto-fill phone when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      setPhone(selectedCustomer.phone)
    }
  }, [customerId, selectedCustomer])

  // Poll for STK status
  useEffect(() => {
    if (!checkoutRequestId || stkStatus === "success" || stkStatus === "failed" || stkStatus === "cancelled") return

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("fuel_stk_push_requests")
        .select("status")
        .eq("checkout_request_id", checkoutRequestId)
        .single()

      if (data && data.status !== "pending") {
        setStkStatus(data.status as "success" | "failed" | "cancelled")
        clearInterval(interval)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [checkoutRequestId, stkStatus, supabase])

  const filteredCustomers = customers.filter(c =>
    c.full_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerId || !amount || !phone) return

    setLoading(true)
    setError(null)
    setCheckoutRequestId(null)
    setStkStatus(null)

    try {
      const res = await fetch("/api/payments/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          amount: parseFloat(amount),
          phone,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "STK Push failed")
      } else {
        setCheckoutRequestId(data.checkoutRequestId)
        setStkStatus("pending")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">M-Pesa STK Push</h1>
        <p className="text-slate-500 text-sm mt-1">Request payment from customer's phone</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* STK Status */}
      {checkoutRequestId && (
        <div className={`p-4 rounded-xl border ${
          stkStatus === "success" ? "bg-green-50 border-green-200" :
          stkStatus === "failed" || stkStatus === "cancelled" ? "bg-red-50 border-red-200" :
          "bg-amber-50 border-amber-200"
        }`}>
          <div className="flex items-center gap-3">
            {stkStatus === "pending" && <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />}
            {stkStatus === "success" && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            {(stkStatus === "failed" || stkStatus === "cancelled") && <AlertCircle className="w-5 h-5 text-red-600" />}
            <div>
              <p className={`font-medium text-sm ${
                stkStatus === "success" ? "text-green-800" :
                stkStatus === "failed" || stkStatus === "cancelled" ? "text-red-800" :
                "text-amber-800"
              }`}>
                {stkStatus === "pending" && "Waiting for customer to complete payment..."}
                {stkStatus === "success" && "Payment received successfully!"}
                {stkStatus === "failed" && "Payment failed"}
                {stkStatus === "cancelled" && "Payment cancelled by customer"}
              </p>
              {stkStatus === "pending" && (
                <p className="text-xs text-amber-600 mt-0.5">
                  <Clock className="w-3 h-3 inline mr-1" />
                  A prompt has been sent to {phone}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="w-4 h-4 text-amber-500" />
            Payment Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer */}
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Input
                placeholder="Search customer..."
                value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setCustomerId("") }}
              />
              {customerSearch && !customerId && (
                <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto bg-white shadow-sm">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setCustomerId(c.id); setCustomerSearch(c.full_name) }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0"
                    >
                      <span className="font-medium">{c.full_name}</span>
                      <span className="text-slate-400 ml-2">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedCustomer && (
                <p className="text-xs text-slate-500">
                  Outstanding: <span className="font-medium text-orange-600">KES {Number(selectedCustomer.outstanding_balance).toLocaleString()}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+254712345678"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Amount (KES)</Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !customerId || !amount || !phone}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : "Send STK Push"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
