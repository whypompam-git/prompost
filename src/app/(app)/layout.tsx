import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ALL_PERMISSIONS, NO_PERMISSIONS } from "@/lib/permissions";
import { OfflineStatus } from "@/components/OfflineStatus";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { SESSION_COOKIE, fetchLiveAccess, verifySession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;

  // Middleware already gates every (app) route, so this only trips if the
  // cookie expired between the middleware check and this render.
  if (!claims) redirect("/login");

  // Live role/permissions, so owner changes apply without a re-login; a
  // deactivated account is bounced to the login screen.
  const live = await fetchLiveAccess(claims.staffId);
  if (live && !live.active) redirect("/login");
  const auth = {
    staffId: claims.staffId,
    name: live?.name ?? claims.name,
    role: live?.role ?? claims.role,
    permissions: live?.permissions ?? (claims.role === "owner" ? ALL_PERMISSIONS : NO_PERMISSIONS),
  };

  return (
    <AuthProvider auth={auth}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
          <OfflineStatus />
          {children}
        </div>
        <MobileBottomNav />
      </div>
    </AuthProvider>
  );
}
