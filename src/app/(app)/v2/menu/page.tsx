"use client";

import Link from "@/components/ui/Link";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut, Settings, Target } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { LEGACY_ITEMS, allowed } from "@/components/layout/navItems";
import { ChangePasswordCard } from "@/components/my/ChangePasswordCard";
import { GoalCard } from "@/components/my/GoalCard";
import { ReviewBadgeCard } from "@/components/my/ReviewBadgeCard";
import { useAuth } from "@/lib/auth/AuthContext";

// เมนูเพิ่มเติม (top right): everything you set up lives here — your goal, password, notification
// choice, workspace settings, the old menu and logging out. The profile only shows a preview.
export default function V2MenuPage() {
  const auth = useAuth();
  const router = useRouter();
  const items = LEGACY_ITEMS.filter((i) => allowed(i, auth));
  return (
    <>
      <Topbar title="เมนูเพิ่มเติม" subtitle="ตั้งค่า" back="/v2/me" />
      <div className="mx-auto w-full max-w-xl flex-1 space-y-3 p-4 pb-24 sm:p-6">
        {auth.role === "owner" && (
          <Link href="/settings/staff" className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-card">
            <Settings size={20} className="text-brand-500" />
            <span className="flex-1 text-sm font-semibold text-gray-800">ตั้งค่า Workspace · พนักงาน · ระบบ</span>
            <ChevronRight size={16} className="text-gray-300" />
          </Link>
        )}
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 px-1 text-xs font-semibold text-gray-500"><Target size={13} /> เป้าหมายของฉัน</h2>
          <GoalCard />
          {auth.role === "owner" && (
            <Link href="/v2/progress" className="flex items-center justify-center gap-1 text-xs font-medium text-brand-600">
              Progress Tracking ของทั้งทีม · ตั้งเป้าให้พนักงาน <ChevronRight size={14} />
            </Link>
          )}
        </section>
        <ReviewBadgeCard />
        <ChangePasswordCard />
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
          <h2 className="border-b border-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-500">เมนูเดิม</h2>
          <div className="divide-y divide-gray-100">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700">
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
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-medium text-rose-600 shadow-card"
        >
          <LogOut size={18} /> ออกจากระบบ
        </button>
      </div>
    </>
  );
}
