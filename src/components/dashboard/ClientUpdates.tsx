"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, MessageSquareWarning, UserCheck } from "lucide-react";
import type { Client, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

// What the clients did that needs the team: clips they sent back for changes
// (still in edit / QC), plus how many are waiting on them. Derived from the
// clips themselves so it never goes stale — it disappears when the fix is sent.
export function ClientUpdates({ tasks, clients }: { tasks: Task[]; clients: Client[] }) {
  const [open, setOpen] = useState(true);
  const name = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";
  const revisions = tasks
    .filter((t) => (t.type === "edit" || t.type === "qc") && (t.revisionCount ?? 0) > 0)
    .sort((a, b) => (a.editDate ?? a.dueDate).localeCompare(b.editDate ?? b.dueDate));
  const waitingPlan = tasks.filter((t) => t.type === "plan").length;
  const waitingCheck = tasks.filter((t) => t.type === "pending").length;
  if (revisions.length === 0 && waitingPlan + waitingCheck === 0) return null;

  return (
    <div className={cn("rounded-2xl border bg-white shadow-card", revisions.length > 0 ? "border-rose-200" : "border-gray-100")}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <MessageSquareWarning size={16} className={revisions.length > 0 ? "text-rose-500" : "text-gray-400"} />
          อัปเดตจากลูกค้า
          {revisions.length > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-medium text-white">{revisions.length} คลิปสั่งแก้</span>}
        </span>
        <span className="flex items-center gap-3 text-xs text-gray-500">
          {waitingCheck > 0 && <span>รอลูกค้าตรวจ {waitingCheck}</span>}
          {waitingPlan > 0 && <span>รอลูกค้าเลือก Plan {waitingPlan}</span>}
          <ChevronDown size={16} className={cn("transition", open && "rotate-180")} />
        </span>
      </button>
      {open && revisions.length > 0 && (
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {revisions.slice(0, 12).map((t) => (
            <Link key={t.id} href={`/tasks/${t.id}`} className="block px-4 py-2.5 hover:bg-gray-50">
              <p className="flex items-center gap-2 text-sm text-gray-800">
                <UserCheck size={14} className="shrink-0 text-rose-400" />
                <span className="font-medium">{name(t.clientId)}</span>
                <span className="truncate text-gray-600">· {t.title}</span>
                <span className="ml-auto shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">แก้รอบที่ {t.revisionCount}</span>
              </p>
              {t.revisionBrief && <p className="mt-0.5 line-clamp-2 pl-6 text-xs text-gray-500">{t.revisionBrief}</p>}
            </Link>
          ))}
          {revisions.length > 12 && <p className="px-4 py-2 text-xs text-gray-400">…และอีก {revisions.length - 12} คลิป</p>}
        </div>
      )}
    </div>
  );
}
