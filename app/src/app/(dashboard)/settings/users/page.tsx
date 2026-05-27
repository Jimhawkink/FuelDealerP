import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Plus } from "lucide-react"
export default async function UsersSettingsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("fuel_users").select("*").order("created_at", { ascending: false })
  const roleColors: Record<string,string> = { dealer_admin:"bg-amber-100 text-amber-700", accountant:"bg-blue-100 text-blue-700", attendant:"bg-green-100 text-green-700" }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <button className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium" style={{background:"linear-gradient(135deg,#F59E0B,#EA580C)"}}><Plus className="w-4 h-4"/>Add User</button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>{["Name","Email","Role","Status","Created"].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-50">
            {(data??[]).map((u:any)=>(
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{u.full_name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${roleColors[u.role]??""}`}>{u.role.replace("_"," ")}</span></td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${u.is_active?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>{u.is_active?"Active":"Inactive"}</span></td>
                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(u.created_at).toLocaleDateString("en-KE")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
