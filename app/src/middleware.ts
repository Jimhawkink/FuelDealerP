import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const AUTH_PAGES = ["/login", "/reset-password", "/update-password"]

// All routes served by the (dashboard) route group (no /dashboard prefix)
const PROTECTED_PREFIXES = [
  "/sales",
  "/shifts",
  "/customers",
  "/payments",
  "/inventory",
  "/reports",
  "/settings",
]

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p))
  const isProtected =
    pathname === "/" ||
    PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))

  // Authenticated user on an auth page → send to app root
  if (isAuthPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  // Unauthenticated user on a protected page → send to login
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