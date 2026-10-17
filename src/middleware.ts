import { NextResponse, type NextRequest } from "next/server";
import { isClientSlugPath } from "@/lib/slug";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/api/portal",
  "/api/public",
  "/portal",
  "/quote",
  "/invoice",
  "/receipt",
  "/contract/", // public share + sign page (note the slash: /contracts/* is staff-only)
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

  if (isPublic(pathname) || isClientSlugPath(pathname) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;

  if (!claims) {
    // data calls get a clean 401 instead of an HTML redirect they can't parse
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "not logged in" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const gate = pathname.startsWith("/accounting")
    ? "accounting"
    : pathname.startsWith("/documents") || pathname.startsWith("/contracts")
      ? "documents"
      : pathname.startsWith("/reports")
        ? "financialTotals"
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
