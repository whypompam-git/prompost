"use client";

import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PortalTaskCard } from "@/components/portal/PortalTaskCard";
import type { TaskStatus, TaskType } from "@/lib/types";
import { cn } from "@/lib/utils";

export type PortalTask = {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  script_text: string | null;
  footage_url: string | null;
  final_url: string | null;
  equipment: string[] | null;
  shots: string[] | null;
};

type SortKey = "default" | "name" | "status";
const STATUS_ORDER: Record<TaskStatus, number> = { todo: 0, in_progress: 1, review: 2, done: 3 };

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: "default", label: "ล่าสุด" },
  { key: "name", label: "ชื่อ ก-ฮ" },
  { key: "status", label: "สถานะ" },
];

export function PortalTaskList({ tasks }: { tasks: PortalTask[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [desc, setDesc] = useState(false);

  const sorted = useMemo(() => {
    if (sortKey === "default") return tasks;
    const list = [...tasks].sort((a, b) =>
      sortKey === "name"
        ? // numeric-aware so "คลิป 2" comes before "คลิป 10"
          a.title.localeCompare(b.title, "th", { numeric: true })
        : STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.title.localeCompare(b.title, "th", { numeric: true }),
    );
    return desc ? list.reverse() : list;
  }, [tasks, sortKey, desc]);

  function pick(key: SortKey) {
    if (key === sortKey && key !== "default") setDesc((d) => !d);
    else {
      setSortKey(key);
      setDesc(false);
    }
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-gray-400">เรียงตาม</span>
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => pick(o.key)}
            className={cn(
              "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium",
              sortKey === o.key
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
            )}
          >
            {o.label}
            {sortKey === o.key && o.key !== "default" && (desc ? <ArrowUpAZ size={12} /> : <ArrowDownAZ size={12} />)}
          </button>
        ))}
      </div>
      <Card className="space-y-2">
        {sorted.map((task) => (
          <PortalTaskCard
            key={task.id}
            title={task.title}
            type={task.type}
            status={task.status}
            scriptText={task.script_text}
            footageUrl={task.footage_url}
            finalUrl={task.final_url}
            equipment={task.equipment ?? []}
            shots={task.shots ?? []}
          />
        ))}
        {sorted.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">ยังไม่มีงานสำหรับลูกค้ารายนี้</p>
        )}
      </Card>
    </>
  );
}
