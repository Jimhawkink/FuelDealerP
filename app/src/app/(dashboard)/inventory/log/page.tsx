import { createClient } from "@/lib/supabase/server"
import { getSessionUser } from "@/lib/auth"
import { redirect } from "next/navigation"

interface SearchParams {
  fuel_type_id?: string
  from?: string
  to?: string
  page?: string
}

const PAGE_SIZE = 50

export default async function InventoryLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  let user
  try { user = await getSessionUser() } catch { redirect("/login") }

  const sp = await searchParams
  const fuelTypeFilter = sp.fuel_type_id ?? ""
  const from = sp.from ?? ""
  const to = sp.to ?? ""
  const page = parseInt(sp.page ?? "1", 10)

  const supabase = await createClient()

  let query = supabase
    .from("fuel_inventory_log")
    .select(`
      id, created_at, quantity_change, resulting_balance, event_type, reference_id,
      fuel_fuel_types!fuel_inventory_log_fuel_type_id_fkey(name),
      fuel_users!fuel_inventory_log_changed_by_fkey(full_name)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (fuelTypeFilter) query = query.eq("fuel_type_id", fuelTypeFilter)
  if (from) query = query.gte("created_at", `${from}T00:00:00`)
  if (to) query = query.lte("created_at", `${to}T23:59:59`)

  const { data: logs, count } = await query
  const { data: fuelTypes } = await supabase.from("fuel_fuel_types").select("id, name").order("name")

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventory Log</h1>
        <p className="text-slate-500 text-sm mt-1">{count ?? 0} entries</p>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3 p-4 bg-white border border-slate-200 rounded-xl">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Fuel Type</label>
          <select name="fuel_type_id" defaultValue={fuelTypeFilter} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
            <option value="">All Types</option>
            {(fuelTypes ?? []).map((f: any) => (
              <option key={f.id} value={f.id}>{f.name.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">From</label>
          <input type="date" name="from" defaultValue={from} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">To</label>
          <input type="date" name="to" defaultValue={to} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div className="flex items-end">
          <button type="submit" className="px-4 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">Filter</button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Fuel Type</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Event</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Change (L)</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Balance (L)</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(logs ?? []).length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No log entries found</td></tr>
              ) : (
                (logs ?? []).map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-slate-700 capitalize">
                      {(log.fuel_fuel_types?.name ?? "—").replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.event_type === "delivery" ? "bg-green-100 text-green-700" :
                        log.event_type === "sale" ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {log.event_type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${Number(log.quantity_change) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {Number(log.quantity_change) >= 0 ? "+" : ""}{Number(log.quantity_change).toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {Number(log.resulting_balance).toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{log.fuel_users?.full_name ?? "System"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && <a href={`?page=${page - 1}&fuel_type_id=${fuelTypeFilter}&from=${from}&to=${to}`} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Previous</a>}
              {page < totalPages && <a href={`?page=${page + 1}&fuel_type_id=${fuelTypeFilter}&from=${from}&to=${to}`} className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Next</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
