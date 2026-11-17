"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { STAGES, statusLabel } from "@/lib/workflow";
import type { Client, ContentCategory, Staff, Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const sel =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300";

type Group = "stage" | "people" | "dates" | "other" | "extra";

// Bottom sheet for acting on many selected tasks at once. Controls are grouped into four
// tabs (ขั้นตอน · คน · วันที่ · อื่นๆ); each control applies at once and resets itself, so it
// always reads as an action. `extra` adds screen-specific actions (e.g. queue / print).
export function BulkActionBar({
  count,
  total,
  clients,
  staff,
  onPatch,
  onStage,
  onDelete,
  onClear,
  onSelectAll,
  extra,
  extraLabel = "เพิ่มเติม",
}: {
  count: number;
  total?: number; // how many rows can be selected here (for "select all")
  clients: Client[];
  staff: Staff[];
  onPatch: (patch: Partial<Omit<Task, "id">>) => void;
  onStage: (stage: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onSelectAll?: () => void;
  extra?: React.ReactNode;
  extraLabel?: string;
}) {
  const [group, setGroup] = useState<Group>("stage");
  const tabs: [Group, string][] = [["stage", "ขั้นตอน"], ["people", "คน"], ["dates", "วันที่"], ["other", "อื่นๆ"], ...(extra ? ([["extra", extraLabel]] as [Group, string][]) : [])];
  const people = (placeholder: string, noneLabel: string, field: "assigneeId" | "editorId" | "shotById") => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{placeholder}</span>
      <select className={sel} value="" onChange={(e) => e.target.value && onPatch({ [field]: e.target.value === "none" ? null : e.target.value })}>
        <option value="">เลือก…</option>
        <option value="none">{noneLabel}</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
  const date = (label: string, field: "scheduledDate" | "editDate" | "postDate") => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      <input type="date" className={sel} value="" onChange={(e) => e.target.value && onPatch({ [field]: e.target.value })} />
    </label>
  );

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-3xl rounded-t-3xl border border-gray-100 bg-white px-4 pb-4 pt-3 shadow-2xl md:bottom-6 md:inset-x-3 md:rounded-2xl">
      <div className="mb-2 flex items-center gap-2">
        <p className="text-sm font-semibold text-gray-900">เลือกอยู่ {count} งาน</p>
        {onSelectAll && total !== undefined && count < total && (
          <button onClick={onSelectAll} className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
            เลือกทั้งหมด ({total})
          </button>
        )}
        <button onClick={onClear} className="ml-auto rounded-full p-1.5 text-gray-400 hover:bg-gray-100" aria-label="ยกเลิกการเลือก">
          <X size={18} />
        </button>
      </div>

      <div className="mb-3 flex gap-1 rounded-xl bg-gray-100 p-1 text-xs font-medium">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setGroup(k)} className={cn("flex-1 rounded-lg py-2", group === k ? "bg-white text-brand-700 shadow-sm" : "text-gray-500")}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {group === "stage" && (
          <>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">ย้ายไปขั้นตอน</span>
              <select className={sel} value="" onChange={(e) => e.target.value && onStage(e.target.value)}>
                <option value="">เลือก…</option>
                {STAGES.map((st) => (
                  <option key={st.key} value={st.key}>
                    {st.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">เปลี่ยนสถานะ</span>
              <select className={sel} value="" onChange={(e) => e.target.value && onPatch({ status: e.target.value as TaskStatus })}>
                <option value="">เลือก…</option>
                {(["todo", "in_progress", "review", "done", "waiting"] as TaskStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {statusLabel("other", st)}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {group === "people" && (
          <>
            {people("ผู้รับผิดชอบ", "ยังไม่มอบหมาย", "assigneeId")}
            {people("ผู้ตัดต่อ (Editor)", "ไม่ระบุ", "editorId")}
            {people("คนถ่าย", "ไม่ระบุ", "shotById")}
          </>
        )}
        {group === "dates" && (
          <>
            {date("วันถ่าย", "scheduledDate")}
            {date("Deadline (วันตัดต่อ)", "editDate")}
            {date("วันโพส", "postDate")}
          </>
        )}
        {group === "other" && (
          <>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">หมวดคอนเทนต์</span>
              <select className={sel} value="" onChange={(e) => e.target.value && onPatch({ contentCategory: e.target.value as ContentCategory })}>
                <option value="">เลือก…</option>
                <option value="mass">Mass</option>
                <option value="royalty">Royalty</option>
                <option value="sell">Sell</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">ย้ายไปลูกค้า</span>
              <select className={sel} value="" onChange={(e) => e.target.value && onPatch({ clientId: e.target.value })}>
                <option value="">เลือก…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {group === "extra" && <div className="flex flex-wrap items-center gap-2 sm:col-span-2">{extra}</div>}
      </div>

      <button onClick={onDelete} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-50 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-100">
        <Trash2 size={15} />
        ลบ {count} งานที่เลือก
      </button>
    </div>
  );
}
