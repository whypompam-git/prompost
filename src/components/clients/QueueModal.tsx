"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Client, Queue, Staff } from "@/lib/types";
import { cn } from "@/lib/utils";

export type QueueDraft = Omit<Queue, "id"> & { id?: string };

const field = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

// Two uses: "จัดเข้าคิว" (pick an existing queue or make a new one for the
// selected clips) and editing one queue's name / shoot date / crew.
export function QueueModal({
  client,
  staff,
  queues,
  editing,
  clipCount,
  onClose,
  onAssign,
  onSave,
}: {
  client: Client;
  staff: Staff[];
  queues: Queue[];
  editing?: Queue;
  clipCount?: number;
  onClose: () => void;
  onAssign?: (queueId: string | null, draft: QueueDraft | null) => Promise<void>;
  onSave?: (draft: QueueDraft) => Promise<void>;
}) {
  const [target, setTarget] = useState<string>(editing ? editing.id : queues.length > 0 ? queues[queues.length - 1].id : "new");
  const [name, setName] = useState(editing?.name ?? `คิว ${queues.length + 1}`);
  const [shootDate, setShootDate] = useState(editing?.shootDate ?? "");
  const [editDate, setEditDate] = useState(editing?.editDate ?? "");
  const [crew, setCrew] = useState<string[]>(editing?.crew ?? []);
  const [note, setNote] = useState(editing?.note ?? "");
  const [busy, setBusy] = useState(false);

  const creating = !editing && target === "new";
  const showForm = Boolean(editing) || creating;

  async function submit() {
    setBusy(true);
    try {
      const draft: QueueDraft = { id: editing?.id, clientId: client.id, name: name.trim(), shootDate: shootDate || undefined, editDate: editDate || undefined, crew, note };
      if (editing) await onSave?.(draft);
      else if (creating) await onAssign?.(null, draft);
      else await onAssign?.(target, null);
      onClose();
    } catch {
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            {editing ? `แก้ไข ${editing.name}` : `จัดเข้าคิว${clipCount ? ` (${clipCount} คลิป)` : ""}`}
          </h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-400">{client.name}</p>

        <div className="space-y-3">
          {!editing && (
            <label className="block text-xs font-medium text-gray-500">
              คิว
              <select value={target} onChange={(e) => setTarget(e.target.value)} className={cn(field, "mt-1")}>
                {queues.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                    {q.shootDate ? ` · ถ่าย ${q.shootDate}` : " · ยังไม่ระบุวัน"}
                  </option>
                ))}
                <option value="new">+ สร้างคิวใหม่</option>
              </select>
            </label>
          )}

          {showForm && (
            <>
              <label className="block text-xs font-medium text-gray-500">
                ชื่อคิว
                <input value={name} onChange={(e) => setName(e.target.value)} className={cn(field, "mt-1")} />
              </label>
              <label className="block text-xs font-medium text-gray-500">
                วันถ่าย (คิวนี้จะลงปฏิทินตามวันนี้)
                <input type="date" value={shootDate} onChange={(e) => setShootDate(e.target.value)} className={cn(field, "mt-1")} />
              </label>
              <label className="block text-xs font-medium text-gray-500">
                วันตัดต่อ (ใส่ให้ทุกคลิปในคิวนี้ — ปรับรายคลิปได้ภายหลัง)
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className={cn(field, "mt-1")} />
              </label>
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">ผู้ดูแล</p>
                <div className="flex flex-wrap gap-2">
                  {staff.map((s) => (
                    <label key={s.id} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs", crew.includes(s.id) ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600")}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={crew.includes(s.id)}
                        onChange={(e) => setCrew((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)))}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
              <label className="block text-xs font-medium text-gray-500">
                โน้ต
                <input value={note} onChange={(e) => setNote(e.target.value)} className={cn(field, "mt-1")} placeholder="สถานที่ / ข้อควรรู้" />
              </label>
            </>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            ยกเลิก
          </button>
          <button
            onClick={submit}
            disabled={busy || (showForm && !name.trim())}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
