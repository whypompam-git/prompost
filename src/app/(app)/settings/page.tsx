"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  listInactiveStaff,
  permanentlyDeleteStaffRow,
  reactivateStaffRow,
} from "@/lib/supabase/queries";
import type { Staff } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [inactive, setInactive] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth.role !== "owner") {
      router.replace("/dashboard");
      return;
    }
    listInactiveStaff()
      .then(setInactive)
      .finally(() => setLoading(false));
  }, [auth.role, router]);

  async function handleReactivate(s: Staff) {
    setInactive((prev) => prev.filter((x) => x.id !== s.id));
    try {
      await reactivateStaffRow(s.id);
    } catch (err) {
      console.error(err);
      setInactive((prev) => [...prev, s]);
      window.alert("กู้คืนไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  async function handlePermanentDelete(s: Staff) {
    if (
      !window.confirm(
        `ลบ "${s.name}" ถาวร? ประวัติวันลาและเงินเดือนของคนนี้จะถูกลบไปด้วย และงานที่เคยมอบหมายให้จะกลายเป็น "ยังไม่มอบหมาย" — กู้คืนไม่ได้`,
      )
    )
      return;
    setInactive((prev) => prev.filter((x) => x.id !== s.id));
    try {
      await permanentlyDeleteStaffRow(s.id);
    } catch (err) {
      console.error(err);
      setInactive((prev) => [...prev, s]);
      window.alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  if (auth.role !== "owner") return null;

  if (loading) {
    return (
      <>
        <Topbar title="ตั้งค่า" subtitle="จัดการพนักงานที่ปิดใช้งาน" />
        <LoadingView />
      </>
    );
  }

  return (
    <>
      <Topbar title="ตั้งค่า" subtitle="จัดการพนักงานที่ปิดใช้งาน" />
      <div className="flex-1 space-y-6 p-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">พนักงานที่ปิดใช้งาน</h2>
          <Card className="space-y-2">
            {inactive.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${s.avatarColor}`}
                >
                  {s.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{s.name}</p>
                  <p className="truncate text-xs text-gray-400">{s.position}</p>
                </div>
                <button
                  onClick={() => handleReactivate(s)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white"
                >
                  <RotateCcw size={13} />
                  กู้คืน
                </button>
                <button
                  onClick={() => handlePermanentDelete(s)}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={13} />
                  ลบถาวร
                </button>
              </div>
            ))}
            {inactive.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">ไม่มีพนักงานที่ปิดใช้งาน</p>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
