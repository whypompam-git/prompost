"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ContractClause } from "@/lib/types";

const field =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

// Edit / add / remove / reorder the numbered clauses. Used by both the
// template editor and the per-contract editor.
export function ClauseEditor({
  clauses,
  onChange,
}: {
  clauses: ContractClause[];
  onChange: (next: ContractClause[]) => void;
}) {
  function patch(i: number, p: Partial<ContractClause>) {
    onChange(clauses.map((c, idx) => (idx === i ? { ...c, ...p } : c)));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= clauses.length) return;
    const next = [...clauses];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {clauses.map((c, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center gap-2">
            <input value={c.heading} onChange={(e) => patch(i, { heading: e.target.value })} className={`${field} font-medium`} placeholder="หัวข้อ เช่น ข้อ 1. ขอบเขตงาน" />
            <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-200 disabled:opacity-30" aria-label="เลื่อนขึ้น">
              <ArrowUp size={14} />
            </button>
            <button onClick={() => move(i, 1)} disabled={i === clauses.length - 1} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-200 disabled:opacity-30" aria-label="เลื่อนลง">
              <ArrowDown size={14} />
            </button>
            <button
              onClick={() => window.confirm(`ลบ "${c.heading || "ข้อนี้"}"?`) && onChange(clauses.filter((_, idx) => idx !== i))}
              className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
              aria-label="ลบ"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <textarea value={c.body} onChange={(e) => patch(i, { body: e.target.value })} rows={Math.min(14, Math.max(4, c.body.split("\n").length + 1))} className={field} />
        </div>
      ))}
      <button
        onClick={() => onChange([...clauses, { heading: `ข้อ ${clauses.length + 1}. `, body: "" }])}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        <Plus size={14} />
        เพิ่มข้อ
      </button>
    </div>
  );
}
