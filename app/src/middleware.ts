import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

// These are the actual URL paths served by the (dashboard) route group.
// Because (dashboard) is a route group, its folder name is NOT part of the URL.
// e.g. src/app/(dashboard)/page.tsx      → /
//      src/app/(dashboard)/customers/... → /customers
const PROTECTED_PATHS = [
  "/",
  "/customers",
  "/inventory",
  "/payments",
  "/reports",
  "/sales",
  "/settings",
  "/shifts",
]

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // If user is logged in and tries to access auth pages, redirect to app root
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/update-password")
  ) {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Protect all dashboard routes - redirect to login if not authenticated
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(p + "/"))
  )

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}