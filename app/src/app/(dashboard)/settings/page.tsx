import Link from "next/link"
import { Smartphone, MessageSquare, Fuel, Users, AlertTriangle } from "lucide-react"
const items = [
  { title:"M-Pesa Config", desc:"Daraja API credentials and C2B setup", href:"/settings/mpesa", icon:<Smartphone className="w-6 h-6 text-green-500"/> },
  { title:"SMS Provider", desc:"Africa's Talking or Twilio configuration", href:"/settings/sms", icon:<MessageSquare className="w-6 h-6 text-blue-500"/> },
  { title:"Fuel Prices", desc:"Set price per litre for each fuel type", href:"/settings/fuel-prices", icon:<Fuel className="w-6 h-6 text-amber-500"/> },
  { title:"User Management", desc:"Create, edit, and deactivate users", href:"/settings/users", icon:<Users className="w-6 h-6 text-purple-500"/> },
  { title:"Stock Thresholds", desc:"Low-stock alert thresholds per fuel type", href:"/settings/thresholds", icon:<AlertTriangle className="w-6 h-6 text-red-500"/> },
]
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(i=>(
          <Link key={i.href} href={i.href} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-amber-200 transition-all">
            <div className="flex items-center gap-3 mb-3">{i.icon}<h3 className="font-semibold text-slate-800">{i.title}</h3></div>
            <p className="text-sm text-slate-500">{i.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
