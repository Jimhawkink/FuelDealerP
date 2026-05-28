"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Package } from "lucide-react"
export default function InventoryPage() {
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  useEffect(() => {
    supabase.from("fuel_inventory").select("*, fuel_fuel_types(name,low_stock_threshold_litres)").then(({data})=>setItems(data??[]))
    const ch = supabase.channel("inventory-live").on("postgres_changes",{event:"UPDATE",schema:"public",table:"fuel_inventory"},(p)=>{setItems(prev=>prev.map(i=>i.id===p.new.id?{...i,...p.new}:i))}).subscribe()
    return ()=>{supabase.removeChannel(ch)}
  },[])
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Fuel Inventory</h1>
        <a href="/inventory/deliveries" className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium" style={{background:"linear-gradient(135deg,#F59E0B,#EA580C)"}}>Record Delivery</a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item:any)=>{
          const threshold = item.fuel_fuel_types?.low_stock_threshold_litres??500
          const pct = Math.min((item.stock_litres/Math.max(threshold*2,1))*100,100)
          const low = item.stock_litres < threshold
          return (
            <div key={item.id} className={`bg-white rounded-xl border p-5 ${low?"border-red-200":"border-slate-200"}`}>
              <div className="flex items-center gap-2 mb-3">
                <Package className={`w-5 h-5 ${low?"text-red-500":"text-amber-500"}`}/>
                <h3 className="font-semibold text-slate-800 capitalize">{item.fuel_fuel_types?.name?.replace("_"," ")}</h3>
                {low&&<span className="ml-auto text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium">Low</span>}
              </div>
              <p className="text-3xl font-bold text-slate-900">{Number(item.stock_litres).toFixed(1)}<span className="text-base font-normal text-slate-400 ml-1">L</span></p>
              <div className="mt-3 w-full bg-slate-100 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${low?"bg-red-500":"bg-amber-400"}`} style={{width:`${pct}%`}}/>
              </div>
              <p className="text-xs text-slate-400 mt-1">Threshold: {threshold} L</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
