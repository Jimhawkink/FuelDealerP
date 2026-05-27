import { AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

interface FuelTypeStock {
  name: string
  stock_litres: number
  low_stock_threshold_litres: number
}

export async function LowStockBanner() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("fuel_inventory")
    .select("stock_litres, fuel_fuel_types(name, low_stock_threshold_litres)")

  if (!data) return null

  const lowStock: FuelTypeStock[] = data
    .filter((row: any) => row.fuel_fuel_types && row.stock_litres < row.fuel_fuel_types.low_stock_threshold_litres)
    .map((row: any) => ({
      name: row.fuel_fuel_types.name,
      stock_litres: row.stock_litres,
      low_stock_threshold_litres: row.fuel_fuel_types.low_stock_threshold_litres,
    }))

  if (lowStock.length === 0) return null

  const fuelNames = lowStock.map((f) =>
    `${f.name.replace("_", " ")} (${f.stock_litres.toFixed(0)}L)`
  ).join(", ")

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
      <span>
        <strong>Low stock alert:</strong> {fuelNames}  below threshold.{" "}
        <a href="/dashboard/inventory/deliveries" className="underline font-medium hover:text-amber-900">
          Record delivery
        </a>
      </span>
    </div>
  )
}
