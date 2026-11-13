"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut, UserCircle2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { LEGACY_ITEMS, allowed } from "@/components/layout/navItems";
import { useAuth } from "@/lib/auth/AuthContext";

// New UI: profile tab. For now it also holds the old menu ("เมนูเดิม") while the new pages are tried out.
export default function V2MePage() {
  const auth = useAuth();
  const router = useRouter();
  const items = LEGACY_ITEMS.filter((i) => allowed(i, auth));

  return (
    <>
      <Topbar title="โปรไฟล์" />
      <div className="flex-1 space-y-5 p-4 sm:p-6">
        <Link href="/profile" className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-card hover:bg-gray-50">
          <UserCircle2 size={36} className="text-gray-400" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-gray-900">ข้อมูลของฉัน</span>
            <span className="block text-xs text-gray-500">รูป ชื่อ บัญชีรับเงิน</span>
          </span>
          <ChevronRight size={18} className="text-gray-300" />
        </Link>

        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">เมนูเดิม</h2>
          <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
                  <Icon size={18} className="text-gray-400" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight size={16} className="text-gray-300" />
                </Link>
              );
            })}
          </div>
        </section>

        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
            router.refresh();
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-medium text-rose-600 hover:bg-rose-50"
        >
          <LogOut size={16} /> ออกจากระบบ
        </button>
      </div>
    </>
  );
}
