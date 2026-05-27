"use client"

import { useState } from "react"
import { Menu, Bell, Fuel } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "./sidebar"

type UserRole = "dealer_admin" | "accountant" | "attendant"

interface TopbarProps {
  role: UserRole
  userName: string
  pendingCount?: number
}

export function Topbar({ role, userName, pendingCount = 0 }: TopbarProps) {
  const [open, setOpen] = useState(false)

  const roleBadgeColor = {
    dealer_admin: "bg-amber-100 text-amber-700 border-amber-200",
    accountant: "bg-blue-100 text-blue-700 border-blue-200",
    attendant: "bg-green-100 text-green-700 border-green-200",
  }[role]

  const roleLabel = {
    dealer_admin: "Admin",
    accountant: "Accountant",
    attendant: "Attendant",
  }[role]

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      {/* Mobile menu */}
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar role={role} userName={userName} onClose={() => setOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Mobile logo */}
        <div className="flex items-center gap-2 md:hidden">
          <Fuel className="w-5 h-5 text-amber-500" />
          <span className="font-bold text-slate-800 text-sm">Alpha Fuel</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Pending reconciliation bell */}
        {(role === "dealer_admin" || role === "accountant") && (
          <a href="/dashboard/payments/reconcile" className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Bell className="w-5 h-5 text-slate-600" />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </a>
        )}

        {/* User badge */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
            <span className="text-amber-700 text-xs font-bold">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-800 leading-tight">{userName}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${roleBadgeColor}`}>
              {roleLabel}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
