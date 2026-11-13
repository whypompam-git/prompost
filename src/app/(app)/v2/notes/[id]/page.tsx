"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, Pin, PinOff, Trash2 } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { NoteEditor } from "@/components/clients/NoteEditor";
import { useAuth } from "@/lib/auth/AuthContext";
import { getTeamNote, listClients, listStaff, trashTeamNote, updateTeamNote, type TeamNote } from "@/lib/supabase/queries";
import type { Client, Staff } from "@/lib/types";
import { cn } from "@/lib/utils";

// One note, full screen. Typing saves by itself (about a second after you stop).
export default function V2NotePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const auth = useAuth();
  const [note, setNote] = useState<TeamNote | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [missing, setMissing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Partial<TeamNote>>({});

  useEffect(() => {
    getTeamNote(id).then((n) => (n ? setNote(n) : setMissing(true))).catch(() => setMissing(true));
    listClients().then(setClients).catch(() => {});
    listStaff().then(setStaff).catch(() => {});
  }, [id]);

  const mine = note ? note.authorId === auth.staffId || auth.role === "owner" : false;

  async function flush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const p = pending.current;
    pending.current = {};
    if (!Object.keys(p).length) return;
    setState("saving");
    try {
      await updateTeamNote(id, p);
      setState("saved");
    } catch {
      setState("error");
    }
  }

  function change(p: Partial<TeamNote>) {
    if (!note || !mine) return;
    setNote({ ...note, ...p });
    pending.current = { ...pending.current, ...p };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 900);
  }

  // save what is left when leaving the page
  useEffect(() => () => void flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (missing) return (<><Topbar back="/v2/notes" title="ไม่พบโน้ตนี้" /></>);
  if (!note) return (<><Topbar back="/v2/notes" title="โน้ต" /><LoadingView /></>);

  const author = staff.find((s) => s.id === note.authorId)?.name;

  return (
    <>
      <Topbar back="/v2/notes" title="โน้ต" subtitle={author ? `โดย ${author}` : undefined} />
      <div className="flex-1 space-y-3 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={note.clientId ?? ""}
            onChange={(e) => change({ clientId: e.target.value || null })}
            disabled={!mine}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700"
            aria-label="ผูกกับลูกค้า"
          >
            <option value="">ไม่ผูกลูกค้า</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {mine && (
            <button onClick={() => change({ pinned: !note.pinned })} className={cn("flex items-center gap-1 rounded-lg border px-2.5 py-1.5", note.pinned ? "border-amber-200 bg-amber-50 text-amber-700" : "border-gray-200 bg-white text-gray-600")}>
              {note.pinned ? <PinOff size={13} /> : <Pin size={13} />} {note.pinned ? "เลิกปักหมุด" : "ปักหมุด"}
            </button>
          )}
          <span className={cn("ml-auto flex items-center gap-1", state === "error" ? "text-rose-600" : "text-gray-400")}>
            {state === "saving" ? "กำลังบันทึก…" : state === "saved" ? (<><Check size={12} /> บันทึกแล้ว</>) : state === "error" ? "บันทึกไม่สำเร็จ" : mine ? "" : "อ่านอย่างเดียว"}
          </span>
        </div>

        {mine ? (
          <NoteEditor
            value={note.body}
            onChange={(v) => change({ body: v })}
            images={note.images}
            onImagesChange={(imgs) => change({ images: imgs })}
            rows={16}
            autoFocus={new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("fresh") === "1"}
            placeholder="เริ่มพิมพ์… บรรทัดแรกจะเป็นหัวข้อ"
          />
        ) : (
          <p className="whitespace-pre-wrap rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-800">{note.body}</p>
        )}

        {mine && (
          <button
            onClick={async () => {
              if (!window.confirm("ลบโน้ตนี้? (ย้ายไปถังขยะ)")) return;
              await flush();
              await trashTeamNote(id);
              router.push("/v2/notes");
            }}
            className="flex items-center gap-1.5 text-sm text-rose-600 hover:underline"
          >
            <Trash2 size={14} /> ลบโน้ต
          </button>
        )}
      </div>
    </>
  );
}
