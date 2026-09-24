"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { STATUS_LABEL } from "@/components/ui/StatusBadge";
import { useTaskSettings } from "@/lib/useTaskSettings";
import type { Client, Staff, Task, TaskStatus, TaskType } from "@/lib/types";

export type TaskFormValues = Omit<Task, "id">;

const todayIso = () => new Date().toISOString().slice(0, 10);

// Quick-create only — everything else (script, ref link, shots, equipment,
// footage/final links, post date...) is filled in on the task's own detail
// page (/tasks/[id]) right after creation, not in this popup.
export function TaskModal({
  clients,
  staff,
  defaultClientId,
  defaultDate,
  onClose,
  onSave,
}: {
  clients: Client[];
  staff: Staff[];
  defaultClientId?: string;
  defaultDate?: string;
  onClose: () => void;
  onSave: (values: TaskFormValues) => void;
}) {
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(defaultClientId ?? clients[0]?.id ?? "");
  const { types } = useTaskSettings();
  const [type, setType] = useState<TaskType>("shoot");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [assigneeId, setAssigneeId] = useState("");
  const [scheduledDate, setScheduledDate] = useState(defaultDate ?? todayIso());
  const [dueDate, setDueDate] = useState(defaultDate ?? todayIso());

  const canSave = title.trim().length > 0 && clientId.length > 0;

  function handleSave() {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      clientId,
      type,
      status,
      assigneeId: assigneeId || null,
      scheduledDate,
      dueDate,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">เพิ่มงานใหม่</h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="ชื่องาน">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ถ่ายภาพสินค้าใหม่ประจำเดือน"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              autoFocus
            />
          </Field>

          <Field label="ลูกค้า">
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="ประเภทงาน">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TaskType)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                {types.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="สถานะ">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="ผู้รับผิดชอบ">
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="">ยังไม่มอบหมาย</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="วันที่ถ่าย">
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </Field>
            <Field label="กำหนดส่ง">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </Field>
          </div>

          <p className="text-xs text-gray-400">
            รายละเอียดอื่นๆ (สคริปต์, Ref Link, Shot, สิ่งที่ต้องเตรียม, ลิงก์ Footage/Final)
            ใส่เพิ่มได้ในหน้ารายละเอียดงานหลังจากสร้างแล้ว
          </p>
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
            สร้างงาน
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}
