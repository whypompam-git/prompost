"use client";

import { useEffect, useState } from "react";
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
  LayoutList,
  Settings,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_LOGO_SRC, APP_NAME } from "@/config/branding";
import { useAuth } from "@/lib/auth/AuthContext";

const NAV_ITEMS = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/calendar", label: "ปฏิทินงาน", icon: CalendarDays },
  { href: "/clients", label: "ลูกค้า", icon: Users },
  { href: "/menu", label: "Menu", icon: LayoutList },
  { href: "/packages", label: "แพ็คเกจ", icon: Package },
  { href: "/hr", label: "พนักงาน", icon: UserCog },
  { href: "/documents", label: "เอกสาร", icon: FileText, permission: "documents" as const },
  { href: "/accounting", label: "บัญชี", icon: Wallet, permission: "accounting" as const },
  { href: "/settings/staff", label: "ตั้งค่า", icon: Settings, ownerOnly: true },
];

const COLLAPSE_KEY = "prompost:sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  const items = NAV_ITEMS.filter(
    (item) =>
      (!item.permission || auth.permissions[item.permission]) && (!item.ownerOnly || auth.role === "owner"),
  );

  const expanded = !collapsed;

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-gray-100 bg-white md:flex",
        collapsed ? "w-16" : "w-16 lg:w-60",
      )}
    >
      <div className={cn("flex h-16 items-center gap-2 px-2", expanded ? "lg:justify-start lg:px-5 justify-center" : "justify-center")}>
        <Image src={APP_LOGO_SRC} alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
        <span className={cn("text-lg font-semibold tracking-tight", expanded ? "hidden lg:inline" : "hidden")}>{APP_NAME}</span>
      </div>

      <nav className={cn("flex-1 space-y-1 px-2 py-4", expanded && "lg:px-3")}>
        {items.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                expanded && "lg:justify-start",
                active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <Icon className={cn("h-4.5 w-4.5", active && "text-brand-600")} size={18} />
              <span className={cn("hidden", expanded && "lg:inline")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={toggleCollapsed}
        title={collapsed ? "ขยายเมนู" : "พับเมนู"}
        className="hidden items-center justify-center gap-2 border-t border-gray-100 py-3 text-xs font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 lg:flex"
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        {expanded && <span>พับเมนู</span>}
      </button>
    </aside>
  );
}
