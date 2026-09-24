"use client";

import { useState } from "react";
import { Camera, ChevronDown, ExternalLink, ListChecks, Pencil, ScrollText } from "lucide-react";
import { ScriptEditor } from "@/components/ui/ScriptEditor";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScriptText } from "@/components/ui/ScriptText";
import type { TaskStatus, TaskType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  shoot: "ถ่ายทำ",
  edit: "ตัดต่อ",
  review: "ตรวจสอบ",
  deliver: "ส่งมอบ",
  other: "อื่นๆ",
};

export function PortalTaskCard({
  taskId,
  clientKey,
  title,
  type,
  status,
  scriptText,
  refUrl,
  footageUrl,
  finalUrl,
  equipment,
  shots,
}: {
  taskId: string;
  clientKey: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  scriptText: string | null;
  refUrl: string | null;
  footageUrl: string | null;
  finalUrl: string | null;
  equipment: string[];
  shots: string[];
}) {
  const [open, setOpen] = useState(false);
  const [script, setScript] = useState(scriptText ?? "");
  const [editingScript, setEditingScript] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const hasScript = Boolean(script.trim());

  async function saveScript() {
    setSaving(true);
    try {
      const res = await fetch("/api/portal/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientKey, taskId, scriptText: draft }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setScript(draft);
      setEditingScript(false);
    } catch {
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }
  const expandable = true;
  const links = [
    { label: "Ref", url: refUrl },
    { label: "File", url: footageUrl },
    { label: "Final", url: finalUrl },
  ].filter((l) => l.url);

  return (
    <div className="rounded-xl bg-gray-50">
      <button
        type="button"
        onClick={() => expandable && setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 px-4 py-3 text-left",
          expandable && "cursor-pointer",
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-800">{title}</p>
          <p className="text-xs text-gray-400">{TYPE_LABEL[type] ?? type}</p>
          {equipment.length > 0 && (
            <p className="mt-1 flex items-start gap-1 text-xs text-gray-500">
              <Camera size={12} className="mt-0.5 shrink-0" />
              <span>เตรียม: {equipment.join(", ")}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={status} />
          {expandable && (
            <ChevronDown size={15} className={cn("text-gray-400 transition", open && "rotate-180")} />
          )}
        </div>
      </button>

      {links.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.url!.startsWith("http") ? l.url! : `https://${l.url}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
            >
              <ExternalLink size={11} />
              {l.label}
            </a>
          ))}
        </div>
      )}

      {open && expandable && (
        <div className="space-y-3 border-t border-gray-100 px-4 py-3">
          {shots.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                <ListChecks size={12} />
                Shot list
              </p>
              <ul className="list-inside list-decimal space-y-0.5 rounded-lg bg-white p-3 text-sm text-gray-700">
                {shots.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="flex items-center gap-1 text-xs font-medium text-gray-500">
                <ScrollText size={12} />
                สคริปต์
              </p>
              {!editingScript && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(script);
                    setEditingScript(true);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  <Pencil size={11} />
                  แก้ไขสคริปต์
                </button>
              )}
            </div>
            {editingScript ? (
              <div className="space-y-2">
                <ScriptEditor value={draft} onChange={setDraft} />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingScript(false)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={saveScript}
                    disabled={saving}
                    className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {saving ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </div>
            ) : hasScript ? (
              <ScriptText text={script} className="rounded-lg bg-white p-3 text-sm text-gray-700" />
            ) : (
              <p className="rounded-lg bg-white p-3 text-sm text-gray-400">ยังไม่มีสคริปต์</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
