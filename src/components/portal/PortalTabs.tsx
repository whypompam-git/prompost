import Link from "next/link";
import { cn } from "@/lib/utils";

export function PortalTabs({
  token,
  active,
}: {
  token: string;
  active: "dashboard" | "info";
}) {
  const tabs = [
    { key: "dashboard" as const, label: "คอนเทนต์", href: `/portal/${token}` },
    { key: "info" as const, label: "ข้อมูลลูกค้า", href: `/portal/${token}/info` },
  ];

  return (
    <div className="flex gap-2 rounded-xl bg-gray-100 p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors",
            active === tab.key ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
