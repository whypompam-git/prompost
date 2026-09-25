"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X, Pencil } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { ScriptEditor } from "@/components/ui/ScriptEditor";
import { LoadingView } from "@/components/ui/LoadingView";
import {
  deleteContentSet,
  listContentSets,
  saveContentSet,
  type ContentSet,
  type ContentSetItem,
} from "@/lib/supabase/queries";

let keySeq = 0;
const nextKey = () => ++keySeq;

const field =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

export default function MenuPage() {
  const [sets, setSets] = useState<ContentSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id?: string; name: string; items: ContentSetItem[]; keys: number[] } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listContentSets()
      .then(setSets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!editing || !editing.name.trim()) return;
    setSaving(true);
    try {
      const saved = await saveContentSet({ name: editing.name.trim(), items: editing.items }, editing.id);
      setSets((prev) => (editing.id ? prev.map((s) => (s.id === saved.id ? saved : s)) : [saved, ...prev]));
      setEditing(null);
    } catch (err) {
      console.error(err);
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(set: ContentSet) {
    if (!window.confirm(`ลบ Set "${set.name}" ใช่ไหม? (งานที่สร้างไปแล้วไม่ถูกลบ)`)) return;
    setSets((prev) => prev.filter((s) => s.id !== set.id));
    try {
      await deleteContentSet(set.id);
    } catch {
      setSets((prev) => [set, ...prev]);
      window.alert("ลบไม่สำเร็จ");
    }
  }

  function patchItem(i: number, patch: Partial<ContentSetItem>) {
    setEditing((e) => e && { ...e, items: e.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  }

  if (loading) {
    return (
      <>
        <Topbar title="Menu" subtitle="Set คอนเทนต์สำหรับเลือกให้ลูกค้า" />
        <LoadingView />
      </>
    );
  }

  return (
    <>
      <Topbar title="Menu" subtitle="Set คอนเทนต์สำหรับเลือกให้ลูกค้า" />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            สร้าง Set ไว้ แล้วไปที่ แดชบอร์ด &gt; เพิ่มหลายงาน เพื่อเลือก Set ให้ลูกค้า ระบบจะสร้างงานทั้งชุดให้เลย
          </p>
          <button
            onClick={() => setEditing({ name: "", items: [{ title: "", script: "", ref: "" }], keys: [nextKey()] })}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            สร้าง Set
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((s) => (
            <Card key={s.id} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.items.length} งาน</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setEditing({ id: s.id, name: s.name, items: s.items, keys: s.items.map(nextKey) })}
                    className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="แก้ไข"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
                    className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="ลบ"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <ul className="space-y-0.5 text-sm text-gray-600">
                {s.items.slice(0, 5).map((it, i) => (
                  <li key={i} className="truncate">
                    • {it.title || "(ไม่มีชื่อ)"}
                  </li>
                ))}
                {s.items.length > 5 && <li className="text-xs text-gray-400">และอีก {s.items.length - 5} งาน</li>}
              </ul>
            </Card>
          ))}
          {sets.length === 0 && (
            <p className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-gray-400 sm:col-span-2 lg:col-span-3">
              ยังไม่มี Set — กด &quot;สร้าง Set&quot;
            </p>
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">{editing.id ? "แก้ไข Set" : "สร้าง Set ใหม่"}</h3>
              <button onClick={() => setEditing(null)} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500">ชื่อ Set</span>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="เช่น แพ็คเกจร้านอาหาร 5 คลิป"
                  className={field}
                />
              </label>
              {editing.items.map((it, i) => (
                <div key={editing.keys[i]} className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400">#{i + 1}</span>
                    <input
                      value={it.title}
                      onChange={(e) => patchItem(i, { title: e.target.value })}
                      placeholder="ชื่องาน/คลิป"
                      className={field}
                    />
                    <button
                      onClick={() => setEditing({
                          ...editing,
                          items: editing.items.filter((_, idx) => idx !== i),
                          keys: editing.keys.filter((_, idx) => idx !== i),
                        })}
                      className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="ลบงานนี้"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <ScriptEditor value={it.script} onChange={(v) => patchItem(i, { script: v })} />
                  <input
                    value={it.ref}
                    onChange={(e) => patchItem(i, { ref: e.target.value })}
                    placeholder="ลิงก์ Ref"
                    className={field}
                  />
                </div>
              ))}
              <button
                onClick={() => setEditing({ ...editing, items: [...editing.items, { title: "", script: "", ref: "" }], keys: [...editing.keys, nextKey()] })}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Plus size={14} />
                เพิ่มงานใน Set
              </button>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editing.name.trim()}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40"
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
