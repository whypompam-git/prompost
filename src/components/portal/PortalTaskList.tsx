"use client";

import { useMemo, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PortalTaskCard } from "@/components/portal/PortalTaskCard";
import type { TaskStatus, TaskType } from "@/lib/types";
import { CLIENT_FILTERS, clientOrder } from "@/lib/portalLabels";
import { cn } from "@/lib/utils";

export type PortalTask = {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  script_text: string | null;
  ref_link: string | null;
  footage_url: string | null;
  final_url: string | null;
  cover_url: string | null;
  equipment: string[] | null;
  shots: string[] | null;
  revision_count?: number | null;
  revision_brief?: string | null;
};

type SortKey = "default" | "name" | "status";
const STATUS_ORDER: Record<TaskStatus, number> = { waiting: 0, todo: 1, in_progress: 2, review: 3, done: 4 };

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: "default", label: "ล่าสุด" },
  { key: "name", label: "ชื่อ ก-ฮ" },
  { key: "status", label: "สถานะ" },
];

export function PortalTaskList({ tasks, clientKey }: { tasks: PortalTask[]; clientKey: string }) {
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [desc, setDesc] = useState(false);
  const [filter, setFilter] = useState("all");
  const counts = useMemo(() => Object.fromEntries(CLIENT_FILTERS.map((f) => [f.key, tasks.filter((t) => f.match({ type: t.type, revisionCount: t.revision_count })).length])), [tasks]);

  const sorted = useMemo(() => {
    const m = CLIENT_FILTERS.find((f) => f.key === filter)?.match ?? (() => true);
    const base = tasks.filter((t) => m({ type: t.type, revisionCount: t.revision_count }));
    // default: what needs the client first
    if (sortKey === "default") return [...base].sort((a, b) => clientOrder({ type: a.type, revisionCount: a.revision_count }) - clientOrder({ type: b.type, revisionCount: b.revision_count }));
    const list = [...base].sort((a, b) =>
      sortKey === "name"
        ? // numeric-aware so "คลิป 2" comes before "คลิป 10"
          a.title.localeCompare(b.title, "th", { numeric: true })
        : STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.title.localeCompare(b.title, "th", { numeric: true }),
    );
    return desc ? list.reverse() : list;
  }, [tasks, sortKey, desc, filter]);

  function pick(key: SortKey) {
    if (key === sortKey && key !== "default") setDesc((d) => !d);
    else {
      setSortKey(key);
      setDesc(false);
    }
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(counts.check > 0 || counts.plan > 0) && (
          <p className="mb-1 w-full rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {counts.check > 0 && `มี ${counts.check} คลิปรอคุณตรวจ`}
            {counts.check > 0 && counts.plan > 0 && " · "}
            {counts.plan > 0 && `มี ${counts.plan} แผนคอนเทนต์รอคุณเลือก`}
            <span className="font-normal"> — กดที่การ์ดเพื่อดูและตอบกลับ</span>
          </p>
        )}
        {CLIENT_FILTERS.filter((f) => f.key === "all" || counts[f.key] > 0 || f.key === filter).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
                        className={cn(
              "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium",
              filter === f.key ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 bg-white text-gray-600",
              f.key === "check" && filter !== f.key && counts.check > 0 && "border-rose-300 bg-rose-50 text-rose-700",
            )}
          >
            {f.label}
            <span className={cn("rounded-full px-1.5 text-[11px]", filter === f.key ? "bg-white/25" : "bg-gray-100 text-gray-500")}>{counts[f.key]}</span>
          </button>
        ))}
      </div>
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
            taskId={task.id}
            clientKey={clientKey}
            title={task.title}
            type={task.type}
            status={task.status}
            scriptText={task.script_text}
            refUrl={task.ref_link}
            footageUrl={task.footage_url}
            finalUrl={task.final_url}
            coverUrl={task.cover_url}
            equipment={task.equipment ?? []}
            shots={task.shots ?? []}
            revisionCount={task.revision_count ?? 0}
            revisionBrief={task.revision_brief ?? null}
          />
        ))}
        {sorted.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400">{tasks.length === 0 ? "ยังไม่มีงานสำหรับลูกค้ารายนี้" : "ไม่มีงานในหมวดนี้"}</p>
        )}
      </Card>
    </>
  );
}
