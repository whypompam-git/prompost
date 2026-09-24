"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useAuth } from "@/lib/auth/AuthContext";
import { listStaff } from "@/lib/supabase/queries";

export function Topbar({
  title,
  subtitle,
  back,
}: {
  title: string;
  subtitle?: string;
  back?: string; // fallback route when there is no history to go back to
}) {
  const router = useRouter();
  const auth = useAuth();
  const [me, setMe] = useState<{ name: string; photoUrl?: string } | null>(null);

  useEffect(() => {
    listStaff().then((staffRows) => {
      const found = staffRows.find((s) => s.id === auth.staffId);
      if (found) setMe({ name: found.name, photoUrl: found.photoUrl });
    });
  }, [auth.staffId]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const displayName = me?.name || auth.name;

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-6">
      <div className="flex min-w-0 items-center gap-2">
        {back && (
          <button
            onClick={() => (window.history.length > 1 ? router.back() : router.push(back))}
            className="-ml-2 rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="ย้อนกลับ"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="truncate text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
          title={displayName}
        >
          {me?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (displayName || "A").charAt(0).toUpperCase()
          )}
        </Link>
        <button
          onClick={handleLogout}
          className="rounded-full p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
          aria-label="ออกจากระบบ"
          title="ออกจากระบบ"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
