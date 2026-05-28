import Link from "next/link"
import { BarChart3, CreditCard, Users, Package, Clock } from "lucide-react"
const reports = [
  { title:"Sales Report", desc:"Daily, weekly, monthly fuel sales", href:"/reports/sales", icon:<BarChart3 className="w-6 h-6 text-amber-500"/> },
  { title:"Payments Report", desc:"Collections by payment channel", href:"/reports/payments", icon:<CreditCard className="w-6 h-6 text-blue-500"/> },
  { title:"Debt Aging", desc:"Outstanding balances by age", href:"/reports/debt-aging", icon:<Users className="w-6 h-6 text-red-500"/> },
  { title:"Inventory Report", desc:"Stock consumption and deliveries", href:"/reports/inventory", icon:<Package className="w-6 h-6 text-green-500"/> },
  { title:"Shift Summary", desc:"Sales per attendant shift", href:"/reports/shifts", icon:<Clock className="w-6 h-6 text-purple-500"/> },
]
export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(r=>(
          <Link key={r.href} href={r.href} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-amber-200 transition-all">
            <div className="flex items-center gap-3 mb-3">{r.icon}<h3 className="font-semibold text-slate-800">{r.title}</h3></div>
            <p className="text-sm text-slate-500">{r.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
