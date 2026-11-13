import Link from "next/link";
import { ClipboardCheck, FolderOpen, Home, Info, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

export type PortalTab = "dashboard" | "review" | "plan" | "files" | "info";

// The client link's tab bar (bottom of the screen): หน้าแรก · ตรวจงาน · แผนคอนเทนต์ · ไฟล์งาน · ข้อมูล
export function PortalTabs({ basePath, active, badges = {} }: { basePath: string; active: PortalTab; badges?: Partial<Record<PortalTab, number>> }) {
  const tabs: { key: PortalTab; label: string; href: string; icon: typeof Home }[] = [
    { key: "dashboard", label: "หน้าแรก", href: basePath, icon: Home },
    { key: "review", label: "ตรวจงาน", href: `${basePath}/review`, icon: ClipboardCheck },
    { key: "plan", label: "แผนคอนเทนต์", href: `${basePath}/plan`, icon: ListTodo },
    { key: "files", label: "ไฟล์งาน", href: `${basePath}/files`, icon: FolderOpen },
    { key: "info", label: "ข้อมูล", href: `${basePath}/info`, icon: Info },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-around">
        {tabs.map((t) => {
          const Icon = t.icon;
          const n = badges[t.key] ?? 0;
          return (
            <Link key={t.key} href={t.href} className={cn("relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium", active === t.key ? "text-brand-600" : "text-gray-500")}>
              <Icon size={22} />
              {t.label}
              {n > 0 && <span className="absolute right-[22%] top-0.5 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{n}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
