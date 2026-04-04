import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_COOKIE_NAME, COMPANY_PROFILE_COOKIE_NAME } from "@/app/lib/constants";

const protectedPaths = ["/builder", "/onboarding"];

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const profileComplete = request.cookies.get(COMPANY_PROFILE_COOKIE_NAME)?.value === "1";
  const { pathname } = request.nextUrl;

  if (!token && protectedPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && pathname === "/onboarding" && profileComplete) {
    return NextResponse.redirect(new URL("/builder", request.url));
  }

  if (token && pathname === "/builder" && !profileComplete) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/onboarding", "/builder"],
};
