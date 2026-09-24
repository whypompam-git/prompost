"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { TagInput } from "@/components/ui/TagInput";
import { ScriptEditor } from "@/components/ui/ScriptEditor";
import { STATUS_LABEL } from "@/components/ui/StatusBadge";
import {
  deleteTaskRow,
  getTask,
  listClients,
  listDistinctShotsAndEquipment,
  listStaff,
  updateTaskRow,
} from "@/lib/supabase/queries";
import { useTaskSettings } from "@/lib/useTaskSettings";
import type { Client, ContentCategory, Staff, Task, TaskStatus, TaskType } from "@/lib/types";

const CATEGORY_OPTIONS: { value: ContentCategory; label: string }[] = [
  { value: "mass", label: "Mass" },
  { value: "royalty", label: "Royalty" },
  { value: "sell", label: "Sell" },
];

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
const labelClass = "mb-1 block text-xs font-medium text-gray-500";

export default function TaskDetailPage() {
  const { types } = useTaskSettings();
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [task, setTask] = useState<Task | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shotSuggestions, setShotSuggestions] = useState<string[]>([]);
  const [equipmentSuggestions, setEquipmentSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      getTask(params.id),
      listClients(),
      listStaff(),
      listDistinctShotsAndEquipment(),
    ])
      .then(([t, c, s, suggestions]) => {
        if (!t) {
          setNotFound(true);
          return;
        }
        setTask(t);
        setClients(c);
        setStaff(s);
        setShotSuggestions(suggestions.shots);
        setEquipmentSuggestions(suggestions.equipment);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  function patch(fields: Partial<Task>) {
    setTask((prev) => (prev ? { ...prev, ...fields } : prev));
  }

  async function handleSave() {
    if (!task) return;
    setSaving(true);
    try {
      await updateTaskRow(task.id, task);
    } catch (err) {
      console.error(err);
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    if (!window.confirm(`ลบงาน "${task.title}" ใช่ไหม?`)) return;
    try {
      await deleteTaskRow(task.id);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      window.alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="งาน" subtitle="" />
        <LoadingView />
      </>
    );
  }

  if (notFound || !task) {
    return (
      <>
        <Topbar title="ไม่พบงานนี้" subtitle="" />
        <div className="p-6">
          <button onClick={() => router.push("/dashboard")} className="text-sm text-brand-600 hover:underline">
            &larr; กลับไปแดชบอร์ด
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="รายละเอียดงาน" subtitle={task.title} />
      <div className="flex-1 space-y-4 p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} />
            กลับ
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3.5 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
            >
              <Trash2 size={15} />
              ลบงาน
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              <Save size={15} />
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>

        <Card className="space-y-4">
          <div>
            <label className={labelClass}>ชื่อ</label>
            <input
              value={task.title}
              onChange={(e) => patch({ title: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>ลูกค้า</label>
              <select
                value={task.clientId}
                onChange={(e) => patch({ clientId: e.target.value })}
                className={inputClass}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Ref Link Video</label>
              <input
                value={task.refLink ?? ""}
                onChange={(e) => patch({ refLink: e.target.value })}
                placeholder="https://..."
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>ประเภทเนื้อหา</label>
              <select
                value={task.contentCategory ?? ""}
                onChange={(e) => patch({ contentCategory: (e.target.value || undefined) as ContentCategory })}
                className={inputClass}
              >
                <option value="">ยังไม่ระบุ</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>ประเภทงาน</label>
              <select
                value={task.type}
                onChange={(e) => patch({ type: e.target.value as TaskType })}
                className={inputClass}
              >
                {types.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>สถานะ</label>
              <select
                value={task.status}
                onChange={(e) => patch({ status: e.target.value as TaskStatus })}
                className={inputClass}
              >
                {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>ผู้รับผิดชอบ</label>
              <select
                value={task.assigneeId ?? ""}
                onChange={(e) => patch({ assigneeId: e.target.value || null })}
                className={inputClass}
              >
                <option value="">ยังไม่มอบหมาย</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>วันที่ถ่าย</label>
              <input
                type="date"
                value={task.scheduledDate}
                onChange={(e) => patch({ scheduledDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>กำหนดส่ง</label>
              <input
                type="date"
                value={task.dueDate}
                onChange={(e) => patch({ dueDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>วันที่โพส</label>
              <input
                type="date"
                value={task.postDate ?? ""}
                onChange={(e) => patch({ postDate: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={Boolean(task.startTime)}
                onChange={(e) =>
                  patch(
                    e.target.checked
                      ? { startTime: "09:00", endTime: "10:00" }
                      : { startTime: undefined, endTime: undefined },
                  )
                }
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-300"
              />
              ระบุเวลา (ไม่บังคับ — ถ้าไม่ติ๊ก จะถือเป็นงานทั้งวัน เหมือน Google Calendar)
            </label>
            {task.startTime && (
              <div className="mt-2 grid grid-cols-2 gap-4 sm:w-1/2">
                <div>
                  <label className={labelClass}>เวลาเริ่ม</label>
                  <input
                    type="time"
                    value={task.startTime ?? ""}
                    onChange={(e) => patch({ startTime: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>เวลาสิ้นสุด</label>
                  <input
                    type="time"
                    value={task.endTime ?? ""}
                    onChange={(e) => patch({ endTime: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <label className={labelClass}>สคริปต์</label>
          <ScriptEditor value={task.scriptText ?? ""} onChange={(v) => patch({ scriptText: v })} />
        </Card>

        <Card className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Shot</label>
            <TagInput
              values={task.shots ?? []}
              onChange={(v) => patch({ shots: v })}
              suggestions={shotSuggestions}
              placeholder="พิมพ์ชื่อชอตแล้ว Enter"
            />
          </div>
          <div>
            <label className={labelClass}>เตรียม</label>
            <TagInput
              values={task.equipment ?? []}
              onChange={(v) => patch({ equipment: v })}
              suggestions={equipmentSuggestions}
              placeholder="พิมพ์สิ่งที่ต้องเตรียมแล้ว Enter"
            />
          </div>
        </Card>

        <Card className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Footage link (Drive)</label>
            <input
              value={task.footageUrl ?? ""}
              onChange={(e) => patch({ footageUrl: e.target.value })}
              placeholder="https://drive.google.com/..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Final link (Drive)</label>
            <input
              value={task.finalUrl ?? ""}
              onChange={(e) => patch({ finalUrl: e.target.value })}
              placeholder="https://drive.google.com/..."
              className={inputClass}
            />
          </div>
        </Card>

        <Card>
          <label className={labelClass}>โน้ตเพิ่มเติม</label>
          <textarea
            value={task.notes ?? ""}
            onChange={(e) => patch({ notes: e.target.value })}
            rows={3}
            className={inputClass}
          />
        </Card>
      </div>
    </>
  );
}
