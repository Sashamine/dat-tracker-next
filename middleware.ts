import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

/**
 * Protect admin-only routes.
 *
 * Protected paths: /anchors, /verify, /admin/* (except /admin/login).
 * If the user lacks a valid admin cookie they are redirected to /admin/login.
 */

const PROTECTED_PREFIXES = ["/anchors", "/verify", "/admin"];
const PUBLIC_ADMIN_PATHS = ["/admin/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only intercept protected paths
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  // Allow the login page itself
  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Check cookie against env
  const adminSecret = process.env.ADMIN_SECRET;
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (!adminSecret || token !== adminSecret) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/anchors/:path*", "/verify/:path*", "/admin/:path*"],
};
