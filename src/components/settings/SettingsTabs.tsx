"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/staff", label: "พนักงาน" },
  { href: "/settings/options", label: "ประเภท & สีงาน" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 border-b border-gray-100 bg-white px-4 sm:px-6">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "border-b-2 px-4 py-2.5 text-sm font-medium transition",
            pathname === t.href
              ? "border-brand-500 text-brand-600"
              : "border-transparent text-gray-500 hover:text-gray-700",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
