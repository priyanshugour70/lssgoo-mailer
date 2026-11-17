import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";
import { openSession } from "@/lib/auth/session-token";

const publicPaths = new Set(["/sign-in"]);

function isPublic(path: string) {
  return (
    publicPaths.has(path) ||
    path.startsWith("/api/v1/auth") ||
    path.startsWith("/api/v1/health")
  );
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const session = await openSession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (!session && !isPublic(path)) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const signIn = new URL("/sign-in", request.url);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|jpg|jpeg)$).*)",
  ],
};
