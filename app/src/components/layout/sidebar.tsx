"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, ShoppingCart, Users, CreditCard,
  Package, BarChart3, Settings, Fuel, Clock, LogOut
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type UserRole = "dealer_admin" | "accountant" | "attendant"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, roles: ["dealer_admin", "accountant", "attendant"] },
  { label: "Sales", href: "/dashboard/sales", icon: <ShoppingCart className="w-4 h-4" />, roles: ["dealer_admin", "accountant", "attendant"] },
  { label: "Shifts", href: "/dashboard/shifts", icon: <Clock className="w-4 h-4" />, roles: ["dealer_admin", "accountant", "attendant"] },
  { label: "Customers", href: "/dashboard/customers", icon: <Users className="w-4 h-4" />, roles: ["dealer_admin", "accountant"] },
  { label: "Payments", href: "/dashboard/payments", icon: <CreditCard className="w-4 h-4" />, roles: ["dealer_admin", "accountant"] },
  { label: "Inventory", href: "/dashboard/inventory", icon: <Package className="w-4 h-4" />, roles: ["dealer_admin", "accountant"] },
  { label: "Reports", href: "/dashboard/reports", icon: <BarChart3 className="w-4 h-4" />, roles: ["dealer_admin", "accountant"] },
  { label: "Settings", href: "/dashboard/settings", icon: <Settings className="w-4 h-4" />, roles: ["dealer_admin"] },
]

interface SidebarProps {
  role: UserRole
  userName: string
  onClose?: () => void
}

export function Sidebar({ role, userName, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const visibleItems = navItems.filter((item) => item.roles.includes(role))

  const roleBadgeColor = {
    dealer_admin: "bg-amber-100 text-amber-700",
    accountant: "bg-blue-100 text-blue-700",
    attendant: "bg-green-100 text-green-700",
  }[role]

  const roleLabel = {
    dealer_admin: "Admin",
    accountant: "Accountant",
    attendant: "Attendant",
  }[role]

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white w-64">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
          <Fuel className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className="font-bold text-sm text-white leading-tight">Alpha Fuel</p>
          <p className="text-xs text-slate-400">Manager</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
            <span className="text-amber-300 text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleBadgeColor}`}>
              {roleLabel}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}
