import { createClient } from "@/lib/supabase/server"
import { getSessionUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UsersSettingsClient } from "@/components/settings/users-settings-client"

export default async function UsersSettingsPage() {
  let user
  try { user = await getSessionUser() } catch { redirect("/login") }
  if (user.role !== "dealer_admin") redirect("/dashboard")

  const supabase = await createClient()
  const { data: users } = await supabase
    .from("fuel_users")
    .select("id, full_name, email, role, is_active, created_at")
    .order("full_name")

  return <UsersSettingsClient users={users ?? []} currentUserId={user.id} />
}
