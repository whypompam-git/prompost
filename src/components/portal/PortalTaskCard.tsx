"use client";

import { useState } from "react";
import { Camera, ChevronDown, ListChecks, Pencil, ScrollText } from "lucide-react";
import { TaskLinkButton } from "@/components/dashboard/TaskLinkButton";
import { ScriptEditor } from "@/components/ui/ScriptEditor";
import { ScriptText } from "@/components/ui/ScriptText";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TagInput } from "@/components/ui/TagInput";
import type { TaskStatus, TaskType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  shoot: "ถ่ายทำ",
  edit: "ตัดต่อ",
  review: "ตรวจสอบ",
  deliver: "ส่งมอบ",
  other: "อื่นๆ",
};

type Section = "prep" | "shots" | "script" | null;

// Tap-to-edit block: shows the value; tapping it swaps in the editor.
function EditableBlock({
  icon,
  label,
  editing,
  onEdit,
  onCancel,
  onSave,
  saving,
  empty,
  view,
  editor,
}: {
  icon: React.ReactNode;
  label: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  empty: boolean;
  view: React.ReactNode;
  editor: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
        {icon}
        {label}
        {!editing && <Pencil size={10} className="ml-0.5 text-gray-300" />}
      </p>
      {editing ? (
        <div className="space-y-2">
          {editor}
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-white"
            >
              ยกเลิก
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="block w-full rounded-lg bg-white p-3 text-left text-sm text-gray-700 hover:ring-2 hover:ring-brand-200"
        >
          {empty ? <span className="text-gray-400">ยังไม่มี — แตะเพื่อเพิ่ม</span> : view}
        </button>
      )}
    </div>
  );
}

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
  const [editing, setEditing] = useState<Section>(null);
  const [saving, setSaving] = useState(false);

  const [script, setScript] = useState(scriptText ?? "");
  const [prep, setPrep] = useState(equipment);
  const [shotList, setShotList] = useState(shots);
  const [links, setLinks] = useState({ ref: refUrl ?? "", file: footageUrl ?? "", final: finalUrl ?? "" });
  const [draftScript, setDraftScript] = useState("");
  const [draftPrep, setDraftPrep] = useState<string[]>([]);
  const [draftShots, setDraftShots] = useState<string[]>([]);

  // Saved through a server route that checks the link is still active and the
  // task belongs to this client — the public page never writes directly.
  async function save(patch: Record<string, unknown>): Promise<boolean> {
    setSaving(true);
    try {
      const res = await fetch("/api/portal/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientKey, taskId, patch }),
      });
      if (!res.ok) throw new Error(String(res.status));
      return true;
    } catch {
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveLink(key: "ref" | "file" | "final", field: string, url: string | undefined) {
    const value = url ?? "";
    if (await save({ [field]: value })) setLinks((l) => ({ ...l, [key]: value }));
  }

  return (
    <div className="rounded-xl bg-gray-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-800">{title}</p>
          <p className="text-xs text-gray-400">{TYPE_LABEL[type] ?? type}</p>
          {prep.length > 0 && (
            <p className="mt-1 flex items-start gap-1 text-xs text-gray-500">
              <Camera size={12} className="mt-0.5 shrink-0" />
              <span>เตรียม: {prep.join(", ")}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={status} />
          <ChevronDown size={15} className={cn("text-gray-400 transition", open && "rotate-180")} />
        </div>
      </button>

      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        <TaskLinkButton label="Ref" url={links.ref || undefined} onSave={(u) => saveLink("ref", "refLink", u)} />
        <TaskLinkButton label="File" url={links.file || undefined} onSave={(u) => saveLink("file", "footageUrl", u)} />
        <TaskLinkButton label="Final" url={links.final || undefined} onSave={(u) => saveLink("final", "finalUrl", u)} />
      </div>

      {open && (
        <div className="space-y-3 border-t border-gray-100 px-4 py-3">
          <EditableBlock
            icon={<Camera size={12} />}
            label="เตรียม"
            editing={editing === "prep"}
            saving={saving}
            empty={prep.length === 0}
            onEdit={() => {
              setDraftPrep(prep);
              setEditing("prep");
            }}
            onCancel={() => setEditing(null)}
            onSave={async () => {
              if (await save({ equipment: draftPrep })) {
                setPrep(draftPrep);
                setEditing(null);
              }
            }}
            view={<span>{prep.join(", ")}</span>}
            editor={<TagInput values={draftPrep} onChange={setDraftPrep} placeholder="พิมพ์สิ่งที่ต้องเตรียมแล้ว Enter" />}
          />

          <EditableBlock
            icon={<ListChecks size={12} />}
            label="Shot list"
            editing={editing === "shots"}
            saving={saving}
            empty={shotList.length === 0}
            onEdit={() => {
              setDraftShots(shotList);
              setEditing("shots");
            }}
            onCancel={() => setEditing(null)}
            onSave={async () => {
              if (await save({ shots: draftShots })) {
                setShotList(draftShots);
                setEditing(null);
              }
            }}
            view={
              <ul className="list-inside list-decimal space-y-0.5">
                {shotList.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            }
            editor={<TagInput values={draftShots} onChange={setDraftShots} placeholder="พิมพ์ shot แล้ว Enter" />}
          />

          <EditableBlock
            icon={<ScrollText size={12} />}
            label="สคริปต์"
            editing={editing === "script"}
            saving={saving}
            empty={!script.trim()}
            onEdit={() => {
              setDraftScript(script);
              setEditing("script");
            }}
            onCancel={() => setEditing(null)}
            onSave={async () => {
              if (await save({ scriptText: draftScript })) {
                setScript(draftScript);
                setEditing(null);
              }
            }}
            view={<ScriptText text={script} className="text-sm text-gray-700" />}
            editor={<ScriptEditor value={draftScript} onChange={setDraftScript} />}
          />
        </div>
      )}
    </div>
  );
}
