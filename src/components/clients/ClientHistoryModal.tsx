"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Pencil, Send, Trash2, X } from "lucide-react";
import {
  createClientNoteRow,
  listClientNotes,
  listStaff,
  trashClientNoteRow,
  updateClientNoteRow,
} from "@/lib/supabase/queries";
import { NoteEditor } from "@/components/clients/NoteEditor";
import { NoteView } from "@/components/clients/NoteView";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Client, ClientNote, Staff } from "@/lib/types";

const todayIso = () => new Date().toISOString().slice(0, 10);

// Call/contact log for one client — add a dated entry each time you talk,
// see the whole history, back-date or edit an entry, and delete goes to a
// recoverable trash (Settings) rather than erasing it outright.
export function ClientHistoryModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const auth = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [draftBy, setDraftBy] = useState(auth.staffId);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [draftImages, setDraftImages] = useState<string[]>([]);
  const [draftDate, setDraftDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ id: string; note: string; noteDate: string; talkedBy: string; images: string[] } | null>(null);

  useEffect(() => {
    listStaff().then(setStaff).catch(() => {});
  }, []);

  const nameOf = (id?: string | null) => staff.find((s) => s.id === id)?.name;

  useEffect(() => {
    listClientNotes(client.id)
      .then(setNotes)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [client.id]);

  async function handleAdd() {
    if (!draft.trim() && draftImages.length === 0) return;
    setSaving(true);
    try {
      const created = await createClientNoteRow(client.id, draft.trim(), draftDate, draftBy || null, draftImages);
      setNotes((prev) => [created, ...prev].sort((a, b) => b.noteDate.localeCompare(a.noteDate)));
      setDraft("");
      setDraftImages([]);
      setDraftDate(todayIso());
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      window.alert(`บันทึกไม่สำเร็จ: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    if (!editing || (!editing.note.trim() && editing.images.length === 0)) return;
    const { id, note, noteDate, talkedBy, images } = editing;
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, note: note.trim(), noteDate, talkedBy: talkedBy || null, images } : n)).sort((a, b) => b.noteDate.localeCompare(a.noteDate)));
    setEditing(null);
    try {
      await updateClientNoteRow(id, { note: note.trim(), noteDate, talkedBy: talkedBy || null, images });
    } catch (err) {
      console.error(err);
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  async function handleDelete(note: ClientNote) {
    if (!window.confirm(`ลบบันทึกวันที่ ${format(new Date(note.noteDate), "d MMM yyyy", { locale: th })} ใช่ไหม?\n\n(ย้ายไปถังขยะ กู้คืนได้ที่ตั้งค่า)`)) return;
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    try {
      await trashClientNoteRow(note.id);
    } catch (err) {
      console.error(err);
      setNotes((prev) => [note, ...prev].sort((a, b) => b.noteDate.localeCompare(a.noteDate)));
      window.alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  const field = "rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">ประวัติการคุย</h3>
            <p className="text-xs text-gray-400">{client.name}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="mb-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">วันที่คุย</span>
            <input type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} className={field} />
            <span className="text-xs font-medium text-gray-500">ใครคุย</span>
            <select value={draftBy} onChange={(e) => setDraftBy(e.target.value)} className={field}>
              <option value="">ไม่ระบุ</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <NoteEditor
              value={draft}
              onChange={setDraft}
              images={draftImages}
              onImagesChange={setDraftImages}
              onSubmit={handleAdd}
              rows={2}
              placeholder="จดว่าคุยอะไรไปรอบนี้..."
              className="flex-1"
            />
            <button
              onClick={handleAdd}
              disabled={saving || (!draft.trim() && draftImages.length === 0)}
              className="flex shrink-0 items-center gap-1 self-end rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40"
            >
              <Send size={14} />
              บันทึก
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {loading && <p className="text-sm text-gray-400">กำลังโหลด...</p>}
          {!loading && notes.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีประวัติการคุย</p>}
          {notes.map((n) =>
            editing?.id === n.id ? (
              <div key={n.id} className="space-y-2 rounded-lg border border-brand-200 bg-brand-50/40 p-3">
                <input
                  type="date"
                  value={editing.noteDate}
                  onChange={(e) => setEditing({ ...editing, noteDate: e.target.value })}
                  className={field}
                />
                <select value={editing.talkedBy} onChange={(e) => setEditing({ ...editing, talkedBy: e.target.value })} className={`w-full ${field}`}>
                  <option value="">ไม่ระบุคนคุย</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <NoteEditor
                  value={editing.note}
                  onChange={(v) => setEditing({ ...editing, note: v })}
                  images={editing.images}
                  onImagesChange={(imgs) => setEditing({ ...editing, images: imgs })}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditing(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-white">
                    ยกเลิก
                  </button>
                  <button onClick={handleSaveEdit} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
                    บันทึก
                  </button>
                </div>
              </div>
            ) : (
              <div key={n.id} className="group rounded-lg bg-gray-50 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    {format(new Date(n.noteDate), "d MMM yyyy", { locale: th })}
                    {nameOf(n.talkedBy) && <span className="ml-2 font-medium text-gray-600">· คุยโดย {nameOf(n.talkedBy)}</span>}
                  </p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => setEditing({ id: n.id, note: n.note, noteDate: n.noteDate, talkedBy: n.talkedBy ?? "", images: n.images ?? [] })}
                      className="rounded-full p-1 text-gray-300 hover:bg-gray-200 hover:text-gray-600"
                      aria-label="แก้ไข"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(n)}
                      className="rounded-full p-1 text-gray-300 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="ลบรายการนี้"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <NoteView text={n.note} images={n.images} />
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
