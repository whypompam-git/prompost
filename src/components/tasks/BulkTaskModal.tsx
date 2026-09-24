"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useTaskSettings } from "@/lib/useTaskSettings";
import type { Client, Task } from "@/lib/types";

const todayIso = () => new Date().toISOString().slice(0, 10);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type BulkTaskValues = {
  clientId: string;
  clientName: string;
  count: number;
  startAt: number;
  type: string;
  scheduledDate: string;
  dueDate: string;
};

// Create many clips at once for one client: "<client>-1" … "<client>-N".
export function BulkTaskModal({
  clients,
  tasks,
  onClose,
  onSave,
}: {
  clients: Client[];
  tasks: Task[];
  onClose: () => void;
  onSave: (values: BulkTaskValues) => Promise<void>;
}) {
  const { types } = useTaskSettings();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [count, setCount] = useState(10);
  const [startTouched, setStartTouched] = useState(false);
  const [startAtManual, setStartAtManual] = useState(1);
  const [type, setType] = useState("shoot");
  const [scheduledDate, setScheduledDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);

  const client = clients.find((c) => c.id === clientId);

  // continue numbering after the client's existing "<name>-<n>" tasks
  const nextNumber = useMemo(() => {
    if (!client) return 1;
    const re = new RegExp(`^${escapeRe(client.name)}-(\\d+)$`);
    let max = 0;
    for (const t of tasks) {
      const m = t.clientId === clientId ? re.exec(t.title) : null;
      if (m) max = Math.max(max, Number(m[1]));
    }
    return max + 1;
  }, [client, clientId, tasks]);

  const startAt = startTouched ? startAtManual : nextNumber;
  const safeCount = Math.min(Math.max(count || 0, 0), 100);
  const canSave = !!client && safeCount > 0 && !saving;

  async function handleSave() {
    if (!client || !canSave) return;
    setSaving(true);
    try {
      await onSave({
        clientId,
        clientName: client.name,
        count: safeCount,
        startAt,
        type,
        scheduledDate,
        dueDate,
      });
    } finally {
      setSaving(false);
    }
  }

  const field =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">เพิ่มหลายงาน</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ลูกค้า</span>
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setStartTouched(false);
              }}
              className={field}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">จำนวนงาน</span>
              <input
                type="number"
                min={1}
                max={100}
                value={count || ""}
                onChange={(e) => setCount(Number(e.target.value))}
                className={field}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">เริ่มที่เลข</span>
              <input
                type="number"
                min={1}
                value={startAt}
                onChange={(e) => {
                  setStartTouched(true);
                  setStartAtManual(Math.max(1, Number(e.target.value) || 1));
                }}
                className={field}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-500">ประเภทงาน</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className={field}>
              {types.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">วันถ่าย</span>
              <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-500">กำหนดส่ง</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={field} />
            </label>
          </div>

          {client && safeCount > 0 && (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              จะสร้าง {safeCount} งาน: {client.name}-{startAt}
              {safeCount > 1 && <> ถึง {client.name}-{startAt + safeCount - 1}</>} (แก้รายละเอียดทีหลังได้)
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "กำลังสร้าง..." : `สร้าง ${safeCount} งาน`}
          </button>
        </div>
      </div>
    </div>
  );
}
