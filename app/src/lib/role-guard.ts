import { NextRequest, NextResponse } from "next/server"
import { requireRole, UserRole } from "@/lib/auth"

type RouteHandler = (req: NextRequest, context?: unknown) => Promise<NextResponse>

/**
 * Wraps an API route handler with role-based access control.
 * Returns 401 if not authenticated, 403 if insufficient role.
 */
export function withRoleGuard(handler: RouteHandler, requiredRole: UserRole): RouteHandler {
  return async (req: NextRequest, context?: unknown) => {
    try {
      await requireRole(requiredRole)
      return handler(req, context)
    } catch (err) {
      if (err instanceof Response) {
        const body = await err.text()
        return new NextResponse(body, {
          status: err.status,
          headers: { "Content-Type": "application/json" },
        })
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
}
