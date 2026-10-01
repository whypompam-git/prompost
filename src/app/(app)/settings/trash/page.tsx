"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { RotateCcw, Trash2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import {
  listTrashedClientNotes,
  permanentlyDeleteClientNoteRow,
  restoreClientNoteRow,
} from "@/lib/supabase/queries";
import type { ClientNote } from "@/lib/types";

type TrashedNote = ClientNote & { clientName: string };

export default function TrashPage() {
  const [notes, setNotes] = useState<TrashedNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTrashedClientNotes()
      .then(setNotes)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  async function handleRestore(note: TrashedNote) {
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    try {
      await restoreClientNoteRow(note.id);
    } catch (err) {
      console.error(err);
      setNotes((prev) => [note, ...prev]);
      window.alert("กู้คืนไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  async function handlePurge(note: TrashedNote) {
    if (!window.confirm("ลบถาวร? กู้คืนไม่ได้แล้ว")) return;
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    try {
      await permanentlyDeleteClientNoteRow(note.id);
    } catch (err) {
      console.error(err);
      setNotes((prev) => [note, ...prev]);
      window.alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  return (
    <>
      <Topbar title="ตั้งค่า" subtitle="ถังขยะ — กู้คืนรายการที่ลบไปได้" />
      <SettingsTabs />
      <div className="flex-1 space-y-3 p-4 sm:p-6">
        {loading ? (
          <LoadingView />
        ) : notes.length === 0 ? (
          <Card className="text-sm text-gray-400">ถังขยะว่างเปล่า</Card>
        ) : (
          notes.map((n) => (
            <Card key={n.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{n.clientName}</p>
                <p className="text-xs text-gray-400">
                  บันทึกวันที่ {format(new Date(n.noteDate), "d MMM yyyy", { locale: th })} · ลบเมื่อ{" "}
                  {n.deletedAt && format(new Date(n.deletedAt), "d MMM yyyy HH:mm", { locale: th })}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{n.note}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => handleRestore(n)}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                  aria-label="กู้คืน"
                  title="กู้คืน"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={() => handlePurge(n)}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="ลบถาวร"
                  title="ลบถาวร"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
