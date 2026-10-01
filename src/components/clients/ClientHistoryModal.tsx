"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Send, Trash2, X } from "lucide-react";
import { createClientNoteRow, deleteClientNoteRow, listClientNotes } from "@/lib/supabase/queries";
import type { Client, ClientNote } from "@/lib/types";

// Call/contact log for one client — add a dated entry each time you talk,
// see the whole history. Separate from the task-facing script/notes.
export function ClientHistoryModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listClientNotes(client.id)
      .then(setNotes)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [client.id]);

  async function handleAdd() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const created = await createClientNoteRow(client.id, draft.trim());
      setNotes((prev) => [created, ...prev]);
      setDraft("");
    } catch (err) {
      console.error(err);
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(note: ClientNote) {
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    try {
      await deleteClientNoteRow(note.id);
    } catch (err) {
      console.error(err);
      setNotes((prev) => [note, ...prev].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }
  }

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

        <div className="mb-3 flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="จดว่าคุยอะไรไปรอบนี้..."
            rows={2}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <button
            onClick={handleAdd}
            disabled={saving || !draft.trim()}
            className="flex shrink-0 items-center gap-1 self-end rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40"
          >
            <Send size={14} />
            บันทึก
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {loading && <p className="text-sm text-gray-400">กำลังโหลด...</p>}
          {!loading && notes.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีประวัติการคุย</p>}
          {notes.map((n) => (
            <div key={n.id} className="group rounded-lg bg-gray-50 p-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs text-gray-400">{format(new Date(n.createdAt), "d MMM yyyy HH:mm", { locale: th })}</p>
                <button
                  onClick={() => handleDelete(n)}
                  className="rounded-full p-1 text-gray-300 opacity-0 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                  aria-label="ลบรายการนี้"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{n.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
