import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LayoutList,
  Mic2,
  Package,
  Settings,
  Target,
  Sparkles,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Permissions } from "@/lib/permissions";

export type NavItem = { href: string; label: string; icon: LucideIcon; permission?: keyof Permissions; ownerOnly?: boolean };

// The original menu. On phones it now lives under โปรไฟล์ → "เมนูเดิม" while the new pages are tried out.
export const LEGACY_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/calendar", label: "ปฏิทินงาน (เดิม)", icon: CalendarDays },
  { href: "/workload", label: "สรุปงาน (เดิม)", icon: ClipboardList },
  { href: "/clients", label: "ลูกค้า (ตาราง)", icon: Users },
  { href: "/mc", label: "MC", icon: Mic2, permission: "mc" },
  { href: "/studio", label: "AI สคริปต์", icon: Sparkles, permission: "studio" },
  { href: "/menu", label: "Menu", icon: LayoutList },
  { href: "/packages", label: "แพ็คเกจ", icon: Package },
  { href: "/hr", label: "พนักงาน", icon: UserCog },
  { href: "/documents", label: "เอกสาร", icon: FileText, permission: "documents" },
  { href: "/accounting", label: "บัญชี", icon: Wallet, permission: "accounting" },
  { href: "/reports", label: "รายงาน", icon: BarChart3, permission: "financialTotals" },
  { href: "/v2/progress", label: "Progress Tracking", icon: Target, ownerOnly: true },
  { href: "/settings/staff", label: "ตั้งค่า", icon: Settings, ownerOnly: true },
];

export const allowed = (item: NavItem, auth: { role: string; permissions: Permissions }) =>
  (!item.permission || auth.permissions[item.permission]) && (!item.ownerOnly || auth.role === "owner");
