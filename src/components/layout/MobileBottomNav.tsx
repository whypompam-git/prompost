"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ClipboardCheck, PlusCircle, UserCircle2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

// Phone tab bar (new UI): ลูกค้า · ปฏิทิน · (+) โน้ต · ตรวจดราฟ · โปรไฟล์.
// The old menu lives under โปรไฟล์ → "เมนูเดิม" until the new pages replace it.
const TABS = [
  { href: "/v2/clients", label: "ลูกค้า", icon: Users, match: ["/v2/clients", "/clients"] },
  { href: "/v2/calendar", label: "ปฏิทิน", icon: CalendarDays, match: ["/v2/calendar", "/calendar", "/workload"] },
];
const TABS_RIGHT = [
  { href: "/v2/review", label: "ตรวจดราฟ", icon: ClipboardCheck, match: ["/v2/review"] },
  { href: "/v2/me", label: "โปรไฟล์", icon: UserCircle2, match: ["/v2/me", "/profile"] },
];

export function MobileBottomNav() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const on = (match: string[]) => match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
  const notesActive = pathname.startsWith("/v2/notes");

  const Tab = ({ t }: { t: (typeof TABS)[number] }) => {
    const Icon = t.icon;
    return (
      <Link href={t.href} className={cn("flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium", on(t.match) ? "text-brand-600" : "text-gray-500")}>
        <Icon size={22} />
        {t.label}
      </Link>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-gray-100 bg-white/95 backdrop-blur md:hidden">
      {TABS.map((t) => (
        <Tab key={t.href} t={t} />
      ))}
      {/* notes page (new note button is at its top) */}
      <button
        onClick={() => router.push("/v2/notes")}
        className={cn("flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-medium", notesActive ? "text-brand-600" : "text-brand-500")}
        aria-label="โน้ต"
      >
        <PlusCircle size={28} />
        โน้ต
      </button>
      {TABS_RIGHT.map((t) => (
        <Tab key={t.href} t={t} />
      ))}
    </nav>
  );
}
