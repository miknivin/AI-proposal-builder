import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_COOKIE_NAME, COMPANY_PROFILE_COOKIE_NAME } from "@/app/lib/constants";

const reservedPaths = new Set([
  "/",
  "/login",
  "/onboarding",
  "/company",
  "/new",
  "/builder",
]);

const isChatPath = (pathname: string) =>
  /^\/[^/]+$/.test(pathname) && !reservedPaths.has(pathname);

const isProtectedPath = (pathname: string) =>
  pathname === "/" ||
  pathname === "/new" ||
  pathname === "/onboarding" ||
  pathname === "/company" ||
  isChatPath(pathname);

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const profileComplete = request.cookies.get(COMPANY_PROFILE_COOKIE_NAME)?.value === "1";
  const { pathname } = request.nextUrl;

  if (!token && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/builder") {
    return NextResponse.redirect(new URL("/new", request.url));
  }

  if (token && pathname === "/onboarding" && profileComplete) {
    return NextResponse.redirect(new URL("/new", request.url));
  }

  if (token && (pathname === "/" || pathname === "/new" || isChatPath(pathname)) && !profileComplete) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (token && pathname === "/" && profileComplete) {
    return NextResponse.redirect(new URL("/new", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
