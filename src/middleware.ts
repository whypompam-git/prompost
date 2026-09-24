import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/portal",
  "/quote",
  "/invoice",
  "/receipt",
  "/print",
  "/manifest.json",
  "/sw.js",
  "/icon-",
  "/apple-touch-icon.png",
  "/favicon-32.png",
  "/logo-source.png",
];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;

  if (!claims) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const gate = pathname.startsWith("/accounting")
    ? "accounting"
    : pathname.startsWith("/documents")
      ? "documents"
      : pathname.startsWith("/settings")
        ? "owner"
        : null;
  if (gate) {
    const live = await fetchLiveAccess(claims.staffId);
    const role = live?.role ?? claims.role;
    const allowed =
      gate === "owner" ? role === "owner" : Boolean(live?.permissions[gate]) || role === "owner";
    if (!allowed || (live && !live.active)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
