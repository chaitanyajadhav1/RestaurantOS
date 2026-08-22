import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { Role } from "@prisma/client";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  const isProtected =
    path.startsWith("/super-admin") ||
    path.startsWith("/admin") ||
    path.startsWith("/staff") ||
    path.startsWith("/kitchen") ||
    path.startsWith("/api/super-admin") ||
    path.startsWith("/api/restaurant-admin");

  // Not a protected route — allow through
  if (!isProtected) return NextResponse.next();

  // No token → redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = token.role as Role;

  // ── Super Admin: only /super-admin and /api/super-admin ──────────
  if (
    (path.startsWith("/super-admin") || path.startsWith("/api/super-admin")) &&
    role !== "SUPER_ADMIN"
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── Hotel Admin / Manager: only /admin and /api/restaurant-admin ─
  if (
    (path.startsWith("/admin") || path.startsWith("/api/restaurant-admin")) &&
    !["RESTAURANT_ADMIN", "MANAGER"].includes(role)
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── Kitchen Staff & Management: /kitchen ─────────────────────────
  if (path.startsWith("/kitchen") && !["KITCHEN_STAFF", "RESTAURANT_ADMIN", "MANAGER"].includes(role)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── Waiter / Cashier & Management: /staff ────────────────────────
  if (path.startsWith("/staff") && !["WAITER", "CASHIER", "RESTAURANT_ADMIN", "MANAGER"].includes(role)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/super-admin/:path*",
    "/admin/:path*",
    "/staff/:path*",
    "/kitchen/:path*",
    "/api/super-admin/:path*",
    "/api/restaurant-admin/:path*",
  ],
};
