"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { STATUS_LABEL } from "@/components/ui/StatusBadge";
import type { Client, Staff, Task, TaskStatus, TaskType } from "@/lib/types";

const TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: "shoot", label: "ถ่ายทำ" },
  { value: "edit", label: "ตัดต่อ" },
  { value: "review", label: "ตรวจสอบ" },
  { value: "deliver", label: "ส่งมอบ" },
  { value: "other", label: "อื่นๆ" },
];

export type TaskFormValues = Omit<Task, "id">;

const todayIso = () => new Date().toISOString().slice(0, 10);

export function TaskModal({
  initial,
  clients,
  staff,
  defaultClientId,
  defaultDate,
  onClose,
  onSave,
}: {
  initial?: Task;
  clients: Client[];
  staff: Staff[];
  defaultClientId?: string;
  defaultDate?: string;
  onClose: () => void;
  onSave: (values: TaskFormValues) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [clientId, setClientId] = useState(
    initial?.clientId ?? defaultClientId ?? clients[0]?.id ?? "",
  );
  const [type, setType] = useState<TaskType>(initial?.type ?? "shoot");
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? "todo");
  const [assigneeId, setAssigneeId] = useState(initial?.assigneeId ?? "");
  const [scheduledDate, setScheduledDate] = useState(
    initial?.scheduledDate ?? defaultDate ?? todayIso(),
  );
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? defaultDate ?? todayIso());
  const [notes, setNotes] = useState(initial?.notes ?? "");

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
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            {initial ? "แก้ไขงาน" : "เพิ่มงานใหม่"}
          </h3>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <Field label="ชื่องาน">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ถ่ายภาพสินค้าใหม่ประจำเดือน"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
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
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
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
            <Field label="วันที่ถ่าย/ทำงาน">
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

          <Field label="โน้ตเพิ่มเติม">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </Field>
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
            บันทึก
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
