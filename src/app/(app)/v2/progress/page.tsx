"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { GoalCard, type GoalData } from "@/components/my/GoalCard";
import { cn } from "@/lib/utils";

type Person = GoalData & { id: string; name: string; position: string; photoUrl: string | null; outsource: boolean };

// Progress Tracking (owner): everyone's goal and progress; set a goal for anyone.
export default function V2ProgressPage() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "team" | "outsource" | "nogoal">("all");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/goals", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? String(res.status));
      setPeople(data.people);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const list = (people ?? []).filter((p) => (filter === "team" ? !p.outsource : filter === "outsource" ? p.outsource : filter === "nogoal" ? !p.goal : true));
    // people with a goal first, the furthest behind on top
    return list.sort((a, b) => (a.goal ? 0 : 1) - (b.goal ? 0 : 1) || (a.goal && b.goal ? a.total / a.goal.target - b.total / b.goal.target : 0) || a.name.localeCompare(b.name, "th"));
  }, [people, filter]);

  const withGoal = (people ?? []).filter((p) => p.goal);
  const reached = withGoal.filter((p) => p.total >= p.goal!.target).length;

  return (
    <>
      <Topbar title="Progress Tracking" subtitle="ตั้งเป้าและดูความคืบหน้าของทีม" />
      {!people && !error ? (
        <LoadingView />
      ) : (
        <div className="flex-1 space-y-4 p-4 pb-24 sm:p-6">
          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {people && (
            <p className="text-sm text-gray-600">
              ตั้งเป้าแล้ว {withGoal.length} / {people.length} คน · ถึงเป้าแล้ว {reached} คน
            </p>
          )}
          <div className="flex gap-2 overflow-x-auto">
            {(
              [
                ["all", "ทั้งหมด"],
                ["team", "ทีมในบริษัท"],
                ["outsource", "Outsource"],
                ["nogoal", "ยังไม่ตั้งเป้า"],
              ] as const
            ).map(([k, label]) => (
              <button key={k} onClick={() => setFilter(k)} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium", filter === k ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 bg-white text-gray-600")}>
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {shown.map((p) => (
              <div key={p.id} className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-brand-100 text-center text-sm font-semibold leading-10 text-brand-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.photoUrl ? <img src={p.photoUrl} alt="" className="h-full w-full object-cover" /> : p.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{p.name}</p>
                    <p className="truncate text-xs text-gray-500">
                      {p.position || "—"}
                      {p.outsource && <span className="ml-1.5 rounded bg-violet-100 px-1.5 text-[10px] font-medium text-violet-700">Outsource</span>}
                    </p>
                  </div>
                </div>
                <GoalCard staffId={p.id} data={p} onChanged={load} compact />
              </div>
            ))}
            {people && shown.length === 0 && <p className="py-10 text-center text-sm text-gray-400">ไม่มีรายชื่อในกลุ่มนี้</p>}
          </div>
        </div>
      )}
    </>
  );
}
