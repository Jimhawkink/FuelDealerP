"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Loader2, ShoppingCart } from "lucide-react"

export default function SalesPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<any[]>([])
  const [fuelTypes, setFuelTypes] = useState<any[]>([])
  const [inventory, setInventory] = useState<Record<string, number>>({})
  const [form, setForm] = useState({ customer_id: "", fuel_type_id: "", quantity_litres: "", sale_type: "pay_now", payment_channel: "cash" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [unitPrice, setUnitPrice] = useState(0)
  const [customerBalance, setCustomerBalance] = useState<{ outstanding: number; limit: number } | null>(null)

  useEffect(() => {
    supabase.from("fuel_customers").select("id, full_name, phone, outstanding_balance, credit_limit").eq("is_active", true).order("full_name").then(({ data }) => setCustomers(data ?? []))
    supabase.from("fuel_fuel_types").select("id, name, current_price_per_litre").then(({ data }) => setFuelTypes(data ?? []))
    supabase.from("fuel_inventory").select("fuel_type_id, stock_litres").then(({ data }) => {
      const map: Record<string, number> = {}
      data?.forEach((r: any) => { map[r.fuel_type_id] = r.stock_litres })
      setInventory(map)
    })
  }, [])

  const total = parseFloat(form.quantity_litres || "0") * unitPrice

  const handleFuelTypeChange = (id: string) => {
    const ft = fuelTypes.find((f) => f.id === id)
    setUnitPrice(ft?.current_price_per_litre ?? 0)
    setForm((p) => ({ ...p, fuel_type_id: id }))
  }

  const handleCustomerChange = (id: string) => {
    const c = customers.find((c) => c.id === id)
    setCustomerBalance(c ? { outstanding: c.outstanding_balance, limit: c.credit_limit } : null)
    setForm((p) => ({ ...p, customer_id: id }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(""); setSuccess("")
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, quantity_litres: parseFloat(form.quantity_litres), unit_price: unitPrice }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setSuccess(`Sale recorded! Total: KES ${total.toLocaleString()}`)
    setForm({ customer_id: "", fuel_type_id: "", quantity_litres: "", sale_type: "pay_now", payment_channel: "cash" })
    setLoading(false)
  }

  const availableStock = form.fuel_type_id ? (inventory[form.fuel_type_id] ?? 0) : null
  const qty = parseFloat(form.quantity_litres || "0")
  const stockError = availableStock !== null && qty > availableStock ? `Only ${availableStock.toFixed(1)} L available` : ""
  const creditError = form.sale_type === "credit" && customerBalance && qty > 0
    ? (customerBalance.outstanding + total > customerBalance.limit ? `Credit limit exceeded. Balance: KES ${customerBalance.outstanding.toLocaleString()}, Limit: KES ${customerBalance.limit.toLocaleString()}` : "")
    : ""

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Sale</h1>
        <p className="text-slate-500 text-sm mt-1">Record a fuel sale</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
            <select value={form.customer_id} onChange={(e) => handleCustomerChange(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-50 outline-none">
              <option value="">Select customer...</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}  {c.phone}</option>)}
            </select>
            {customerBalance && <p className="text-xs text-slate-500 mt-1">Balance: KES {customerBalance.outstanding.toLocaleString()} / Limit: KES {customerBalance.limit.toLocaleString()}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fuel Type</label>
              <select value={form.fuel_type_id} onChange={(e) => handleFuelTypeChange(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-amber-400 outline-none">
                <option value="">Select...</option>
                {fuelTypes.map((f) => <option key={f.id} value={f.id}>{f.name.replace("_", " ")}  KES {f.current_price_per_litre}/L</option>)}
              </select>
              {availableStock !== null && <p className="text-xs text-slate-500 mt-1">Stock: {availableStock.toFixed(1)} L</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity (Litres)</label>
              <input type="number" step="0.001" min="0.001" value={form.quantity_litres} onChange={(e) => setForm((p) => ({ ...p, quantity_litres: e.target.value }))} required className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-amber-400 outline-none" placeholder="0.000" />
            </div>
          </div>
          {total > 0 && <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3"><p className="text-amber-800 font-semibold">Total: KES {total.toLocaleString()}</p></div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Payment Type</label>
            <div className="flex gap-3">
              {["pay_now", "credit"].map((t) => (
                <button key={t} type="button" onClick={() => setForm((p) => ({ ...p, sale_type: t }))}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${form.sale_type === t ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"}`}>
                  {t === "pay_now" ? "Pay Now" : "Credit (Pay Later)"}
                </button>
              ))}
            </div>
          </div>
          {form.sale_type === "pay_now" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Channel</label>
              <select value={form.payment_channel} onChange={(e) => setForm((p) => ({ ...p, payment_channel: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-amber-400 outline-none">
                {["cash","mpesa_paybill","mpesa_till","mpesa_stk","pesalink","eft_rtgs","bank_deposit"].map((c) => <option key={c} value={c}>{c.replace(/_/g, " ").toUpperCase()}</option>)}
              </select>
            </div>
          )}
          {(stockError || creditError || error) && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">{stockError || creditError || error}</div>}
          {success && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm">{success}</div>}
          <button type="submit" disabled={loading || !!stockError || !!creditError} className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: "linear-gradient(135deg, #F59E0B, #EA580C)" }}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</> : <><ShoppingCart className="w-4 h-4" /> Record Sale</>}
          </button>
        </form>
      </div>
    </div>
  )
}
