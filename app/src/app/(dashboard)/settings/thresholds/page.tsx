"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, Loader2, Shield } from "lucide-react"

interface FuelType {
  id: string
  name: string
  low_stock_threshold_litres: number
}

export default function ThresholdsPage() {
  const supabase = createClient()
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([])
  const [thresholds, setThresholds] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    supabase.from("fuel_fuel_types").select("id, name, low_stock_threshold_litres").order("name")
      .then(({ data }) => {
        setFuelTypes(data ?? [])
        const initial: Record<string, string> = {}
        for (const ft of data ?? []) {
          initial[ft.id] = ft.low_stock_threshold_litres.toString()
        }
        setThresholds(initial)
      })
  }, [supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      for (const ft of fuelTypes) {
        const newThreshold = parseFloat(thresholds[ft.id] ?? "0")
        if (newThreshold === ft.low_stock_threshold_litres) continue

        const { error: updateError } = await supabase
          .from("fuel_fuel_types")
          .update({ low_stock_threshold_litres: newThreshold })
          .eq("id", ft.id)

        if (updateError) {
          setError(`Failed to update threshold for ${ft.name}`)
          return
        }
      }
      setSuccess("Thresholds updated successfully")
    } catch { setError("Network error") }
    finally { setLoading(false) }
  }

  const formatFuelName = (name: string) =>
    name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Low-Stock Thresholds</h1>
        <p className="text-slate-500 text-sm mt-1">Set alert thresholds per fuel type</p>
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
            <Shield className="w-4 h-4 text-red-500" />
            Alert Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <p className="text-sm text-slate-500">
              A low-stock warning will appear when stock falls below the threshold.
            </p>
            {fuelTypes.map(ft => (
              <div key={ft.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-700">{formatFuelName(ft.name)}</label>
                  <p className="text-xs text-slate-400">Current: {ft.low_stock_threshold_litres.toLocaleString()} L</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    value={thresholds[ft.id] ?? ""}
                    onChange={e => setThresholds(t => ({ ...t, [ft.id]: e.target.value }))}
                    className="w-28"
                  />
                  <span className="text-sm text-slate-500">L</span>
                </div>
              </div>
            ))}

            <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-white mt-4">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Thresholds"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
