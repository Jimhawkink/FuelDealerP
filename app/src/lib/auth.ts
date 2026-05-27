import { createClient } from "@/lib/supabase/server"

export type UserRole = "dealer_admin" | "accountant" | "attendant"

export interface SessionUser {
  id: string
  email: string | undefined
  role: UserRole
  full_name?: string
}

// Role hierarchy: dealer_admin > accountant > attendant
const ROLE_HIERARCHY: Record<UserRole, number> = {
  dealer_admin: 3,
  accountant: 2,
  attendant: 1,
}

/**
 * Returns the authenticated user with role from app_metadata.
 * Throws a 401 error if no session exists.
 */
export async function getSessionUser(): Promise<SessionUser> {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Response("Unauthorized", { status: 401 })
  }

  const role = (user.app_metadata?.role as UserRole) ?? "attendant"

  return {
    id: user.id,
    email: user.email,
    role,
    full_name: user.user_metadata?.full_name,
  }
}

/**
 * Verifies the current user has at least the required role.
 * Throws a 403 error if the user's role is insufficient.
 *
 * Role hierarchy: dealer_admin > accountant > attendant
 *
 * @param requiredRole - The minimum role required to access the resource
 */
export async function requireRole(requiredRole: UserRole): Promise<SessionUser> {
  const user = await getSessionUser()

  const userLevel = ROLE_HIERARCHY[user.role] ?? 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0

  if (userLevel < requiredLevel) {
    throw new Response(
      JSON.stringify({
        error: "Forbidden",
        message: `This action requires the '${requiredRole}' role or higher. Your current role is '${user.role}'.`,
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  return user
}

/**
 * Checks if a role meets the minimum required role without throwing.
 * Useful for conditional rendering.
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0
  return userLevel >= requiredLevel
}
