import { createClient } from "@/lib/supabase/server"
import { TrendingDown } from "lucide-react"

export async function TopDebtors() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("fuel_customers")
    .select("id, full_name, outstanding_balance, credit_limit")
    .gt("outstanding_balance", 0)
    .order("outstanding_balance", { ascending: false })
    .limit(10)

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Top Debtors</h3>
        <p className="text-slate-400 text-sm text-center py-4">No outstanding balances</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <TrendingDown className="w-4 h-4 text-red-500" />
        <h3 className="font-semibold text-slate-800">Top Debtors</h3>
      </div>
      <div className="divide-y divide-slate-50">
        {data.map((customer: any, i: number) => {
          const utilisation = customer.credit_limit > 0
            ? Math.min((customer.outstanding_balance / customer.credit_limit) * 100, 100)
            : 100
          return (
            <a key={customer.id} href={`/dashboard/customers/${customer.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
              <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{customer.full_name}</p>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                  <div
                    className={`h-1.5 rounded-full ${utilisation >= 90 ? "bg-red-500" : utilisation >= 70 ? "bg-amber-500" : "bg-blue-400"}`}
                    style={{ width: `${utilisation}%` }}
                  />
                </div>
              </div>
              <p className="text-sm font-semibold text-red-600 flex-shrink-0">
                KES {Number(customer.outstanding_balance).toLocaleString()}
              </p>
            </a>
          )
        })}
      </div>
    </div>
  )
}
