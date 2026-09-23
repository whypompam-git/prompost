"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ClientSubNav({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const infoHref = `/clients/${clientId}/info`;
  const contentHref = `/clients/${clientId}`;
  const onInfo = pathname === infoHref;

  const tabs = [
    { href: contentHref, label: "คอนเทนต์", active: !onInfo },
    { href: infoHref, label: "ข้อมูลลูกค้า", active: onInfo },
  ];

  return (
    <div className="flex gap-1 border-b border-gray-100">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "border-b-2 px-4 py-2.5 text-sm font-medium transition",
            tab.active
              ? "border-brand-500 text-brand-600"
              : "border-transparent text-gray-500 hover:text-gray-700",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
