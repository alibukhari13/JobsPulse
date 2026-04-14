import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/session";
import { cookies } from "next/headers";

export async function proxy(request: NextRequest) {
  const session = await getIronSession<{ user: SessionData }>(
    await cookies(),
    sessionOptions
  );

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");

  if (!session.user?.isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session.user?.isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};