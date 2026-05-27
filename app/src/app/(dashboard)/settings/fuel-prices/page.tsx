"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, DollarSign, Loader2 } from "lucide-react"

interface FuelType {
  id: string
  name: string
  current_price_per_litre: number
}

export default function FuelPricesPage() {
  const supabase = createClient()
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([])
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    supabase.from("fuel_fuel_types").select("id, name, current_price_per_litre").order("name")
      .then(({ data }) => {
        setFuelTypes(data ?? [])
        const initialPrices: Record<string, string> = {}
        for (const ft of data ?? []) {
          initialPrices[ft.id] = ft.current_price_per_litre.toString()
        }
        setPrices(initialPrices)
      })
  }, [supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      for (const ft of fuelTypes) {
        const newPrice = parseFloat(prices[ft.id] ?? "0")
        if (newPrice === ft.current_price_per_litre) continue

        const res = await fetch(`/api/settings/fuel-prices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fuel_type_id: ft.id, price_per_litre: newPrice }),
        })

        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? "Failed to update price")
          return
        }
      }
      setSuccess("Fuel prices updated successfully")
    } catch { setError("Network error") }
    finally { setLoading(false) }
  }

  const formatFuelName = (name: string) =>
    name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Fuel Prices</h1>
        <p className="text-slate-500 text-sm mt-1">Set price per litre for each fuel type</p>
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
            <DollarSign className="w-4 h-4 text-amber-500" />
            Current Prices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            {fuelTypes.map(ft => (
              <div key={ft.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-700">{formatFuelName(ft.name)}</label>
                  <p className="text-xs text-slate-400">Current: KES {ft.current_price_per_litre.toFixed(2)}/L</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">KES</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={prices[ft.id] ?? ""}
                    onChange={e => setPrices(p => ({ ...p, [ft.id]: e.target.value }))}
                    className="w-28"
                  />
                  <span className="text-sm text-slate-500">/L</span>
                </div>
              </div>
            ))}

            <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-white mt-4">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Prices"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
