import { Sidebar } from "@/components/layout/Sidebar";
import { OfflineStatus } from "@/components/OfflineStatus";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineStatus />
        {children}
      </div>
    </div>
  );
}
