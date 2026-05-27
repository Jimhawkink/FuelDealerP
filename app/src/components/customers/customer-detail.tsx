"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Loader2, MessageSquare, UserX } from "lucide-react"

interface Customer {
  id: string
  full_name: string
  phone: string
  email: string | null
  company_name: string | null
  outstanding_balance: number
  credit_limit: number
  is_active: boolean
  created_at: string
}

interface StatementEntry {
  id: string
  date: string
  type: "sale" | "payment"
  description: string
  debit: number
  credit: number
  balance: number
}

interface Aging {
  d0_30: number
  d31_60: number
  d61_90: number
  d90plus: number
}

interface Props {
  customer: Customer
  statement: StatementEntry[]
  aging: Aging
  role: string
}

export function CustomerDetail({ customer, statement, aging, role }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [smsLoading, setSmsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    full_name: customer.full_name,
    phone: customer.phone,
    email: customer.email ?? "",
    company_name: customer.company_name ?? "",
    credit_limit: customer.credit_limit.toString(),
  })

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: editForm.full_name,
          phone: editForm.phone,
          email: editForm.email || null,
          company_name: editForm.company_name || null,
          credit_limit: parseFloat(editForm.credit_limit) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? "Failed to update")
      else { setSuccess("Customer updated successfully"); router.refresh() }
    } catch { setError("Network error") }
    finally { setLoading(false) }
  }

  const handleDeactivate = async () => {
    if (!confirm(`Deactivate ${customer.full_name}? They will not be able to make new purchases.`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" })
      if (res.ok) router.push("/dashboard/customers")
      else { const d = await res.json(); setError(d.error ?? "Failed to deactivate") }
    } catch { setError("Network error") }
    finally { setLoading(false) }
  }

  const handleSmsReminder = async () => {
    setSmsLoading(true)
    try {
      const res = await fetch("/api/sms/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_ids: [customer.id] }),
      })
      if (res.ok) setSuccess("SMS reminder sent")
      else { const d = await res.json(); setError(d.error ?? "Failed to send SMS") }
    } catch { setError("Network error") }
    finally { setSmsLoading(false) }
  }

  const totalAging = aging.d0_30 + aging.d31_60 + aging.d61_90 + aging.d90plus
  const utilisation = Number(customer.credit_limit) > 0
    ? (Number(customer.outstanding_balance) / Number(customer.credit_limit)) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{customer.full_name}</h1>
          {customer.company_name && <p className="text-slate-500 text-sm">{customer.company_name}</p>}
          <p className="text-slate-400 text-sm">{customer.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          {!customer.is_active && (
            <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-medium">Inactive</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSmsReminder}
            disabled={smsLoading || !customer.is_active}
            className="text-slate-600"
          >
            {smsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-1" />}
            SMS Reminder
          </Button>
        </div>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Outstanding Balance</p>
            <p className={`text-xl font-bold ${Number(customer.outstanding_balance) > 0 ? "text-orange-600" : "text-green-600"}`}>
              KES {Number(customer.outstanding_balance).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Credit Limit</p>
            <p className="text-xl font-bold text-slate-800">
              KES {Number(customer.credit_limit).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Credit Utilisation</p>
            <p className={`text-xl font-bold ${utilisation >= 90 ? "text-red-600" : utilisation >= 70 ? "text-orange-500" : "text-slate-800"}`}>
              {utilisation.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-slate-500">Available Credit</p>
            <p className="text-xl font-bold text-slate-800">
              KES {Math.max(0, Number(customer.credit_limit) - Number(customer.outstanding_balance)).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {(error || success) && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${error ? "bg-red-50 border border-red-200 text-red-800" : "bg-green-50 border border-green-200 text-green-800"}`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error ?? success}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="statement">
        <TabsList>
          <TabsTrigger value="statement">Statement</TabsTrigger>
          <TabsTrigger value="aging">Debt Aging</TabsTrigger>
          {role === "dealer_admin" && <TabsTrigger value="edit">Edit</TabsTrigger>}
        </TabsList>

        {/* Statement Tab */}
        <TabsContent value="statement">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Description</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Debit</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Credit</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {statement.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No transactions yet</td></tr>
                  ) : (
                    statement.map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                          {new Date(entry.date).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{entry.description}</td>
                        <td className="px-4 py-3 text-right text-red-600">
                          {entry.debit > 0 ? `KES ${entry.debit.toLocaleString("en-KE", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600">
                          {entry.credit > 0 ? `KES ${entry.credit.toLocaleString("en-KE", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${entry.balance > 0 ? "text-orange-600" : "text-green-600"}`}>
                          KES {entry.balance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Debt Aging Tab */}
        <TabsContent value="aging">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "0–30 Days", amount: aging.d0_30, color: "text-green-600" },
              { label: "31–60 Days", amount: aging.d31_60, color: "text-yellow-600" },
              { label: "61–90 Days", amount: aging.d61_90, color: "text-orange-600" },
              { label: "90+ Days", amount: aging.d90plus, color: "text-red-600" },
            ].map(bucket => (
              <Card key={bucket.label}>
                <CardContent className="pt-4">
                  <p className="text-xs text-slate-500">{bucket.label}</p>
                  <p className={`text-lg font-bold ${bucket.color}`}>
                    KES {bucket.amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </p>
                  {totalAging > 0 && (
                    <p className="text-xs text-slate-400 mt-1">{((bucket.amount / totalAging) * 100).toFixed(1)}%</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-700">Total Outstanding</span>
                <span className="text-xl font-bold text-orange-600">
                  KES {totalAging.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Edit Tab (dealer_admin only) */}
        {role === "dealer_admin" && (
          <TabsContent value="edit">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Company Name</Label>
                    <Input value={editForm.company_name} onChange={e => setEditForm(f => ({ ...f, company_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Credit Limit (KES)</Label>
                    <Input type="number" min="0" step="0.01" value={editForm.credit_limit} onChange={e => setEditForm(f => ({ ...f, credit_limit: e.target.value }))} />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-white">
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
                  </Button>
                  {customer.is_active && (
                    <Button
                      variant="outline"
                      onClick={handleDeactivate}
                      disabled={loading}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Deactivate Customer
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
