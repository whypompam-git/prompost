"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  PlusCircle,
  Users,
  Menu,
  X,
  UserCog,
  Wallet,
  Package,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthContext";

const MAIN_ITEMS = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/calendar", label: "ปฏิทิน", icon: CalendarDays },
];

const MORE_ITEMS = [
  { href: "/packages", label: "แพ็คเกจ", icon: Package },
  { href: "/hr", label: "พนักงาน", icon: UserCog },
  { href: "/accounting", label: "บัญชี", icon: Wallet, permission: "canViewAccounting" as const },
  { href: "/settings/staff", label: "ตั้งค่า", icon: Settings, ownerOnly: true },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreItems = MORE_ITEMS.filter(
    (item) =>
      (!item.permission || auth[item.permission]) && (!item.ownerOnly || auth.role === "owner"),
  );
  const moreActive = moreItems.some((item) => pathname?.startsWith(item.href));

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-16 left-0 right-0 rounded-t-2xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">เมนูอื่นๆ</span>
              <button onClick={() => setMoreOpen(false)} className="rounded-full p-1 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-1">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium",
                      active ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-50",
                    )}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-gray-100 bg-white/95 backdrop-blur md:hidden">
        {MAIN_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium",
                active ? "text-brand-600" : "text-gray-500",
              )}
            >
              <Icon size={22} />
              {item.label}
            </Link>
          );
        })}

        <button
          onClick={() => router.push("/dashboard?new=1")}
          className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-brand-500"
          aria-label="เพิ่มงานใหม่"
        >
          <PlusCircle size={30} />
        </button>

        <Link
          href="/clients"
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium",
            pathname?.startsWith("/clients") ? "text-brand-600" : "text-gray-500",
          )}
        >
          <Users size={22} />
          ลูกค้า
        </Link>

        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium",
            moreActive || moreOpen ? "text-brand-600" : "text-gray-500",
          )}
        >
          <Menu size={22} />
          อื่นๆ
        </button>
      </nav>
    </>
  );
}
