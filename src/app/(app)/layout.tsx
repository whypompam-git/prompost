import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { OfflineStatus } from "@/components/OfflineStatus";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;

  // Middleware already gates every (app) route, so this only trips if the
  // cookie expired between the middleware check and this render.
  if (!claims) redirect("/login");

  return (
    <AuthProvider claims={claims}>
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
