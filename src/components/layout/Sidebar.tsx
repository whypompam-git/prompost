"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCog,
  Wallet,
  Package,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_LOGO_SRC, APP_NAME } from "@/config/branding";
import { useAuth } from "@/lib/auth/AuthContext";

const NAV_ITEMS = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/calendar", label: "ปฏิทินงาน", icon: CalendarDays },
  { href: "/clients", label: "ลูกค้า", icon: Users },
  { href: "/packages", label: "แพ็คเกจ", icon: Package },
  { href: "/hr", label: "พนักงาน", icon: UserCog },
  { href: "/accounting", label: "บัญชี", icon: Wallet, permission: "canViewAccounting" as const },
  { href: "/settings/staff", label: "ตั้งค่า", icon: Settings, ownerOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const items = NAV_ITEMS.filter(
    (item) =>
      (!item.permission || auth[item.permission]) && (!item.ownerOnly || auth.role === "owner"),
  );

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-100 bg-white md:flex">
      <div className="flex h-16 items-center gap-2 px-5">
        <Image src={APP_LOGO_SRC} alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
        <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <Icon className={cn("h-4.5 w-4.5", active && "text-brand-600")} size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
