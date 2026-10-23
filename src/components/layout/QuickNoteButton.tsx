"use client";

import { useEffect, useState } from "react";
import { Check, MessageSquarePlus, Search, X } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { createClientNoteRow, listClients, listStaff } from "@/lib/supabase/queries";
import type { Client, Staff } from "@/lib/types";
import { cn } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);

// "Note" button in the top bar (left of the bell): jot what was just said to a
// client in one pop-up from any page. Saved into that client's chat history.
export function QuickNoteButton() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [clientId, setClientId] = useState("");
  const [by, setBy] = useState(auth.staffId);
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState("");

  useEffect(() => {
    if (!open || clients.length > 0) return;
    Promise.all([listClients(), listStaff()]).then(([c, s]) => {
      setClients(c);
      setStaff(s);
    }).catch(() => {});
  }, [open, clients.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(""), 2500);
    return () => clearTimeout(t);
  }, [done]);

  async function save() {
    if (!clientId || !text.trim() || saving) return;
    setSaving(true);
    try {
      await createClientNoteRow(clientId, text.trim(), date || today(), by || null);
      setDone(`บันทึกการคุยกับ ${clients.find((c) => c.id === clientId)?.name ?? "ลูกค้า"} แล้ว`);
      setText("");
      setDate(today());
      setClientId("");
      setQuery("");
      setOpen(false);
    } catch {
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  const q = query.trim().toLowerCase();
  const shown = q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients;
  const field = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-brand-600"
        aria-label="จดการคุยกับลูกค้า"
        title="จดการคุยกับลูกค้า"
      >
        <MessageSquarePlus size={18} />
        <span className="hidden sm:inline">Note</span>
      </button>
      {done && (
        <div className="fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg md:bottom-6">{done}</div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onMouseDown={() => setOpen(false)}>
          <div className="flex max-h-[88vh] w-full max-w-xl flex-col rounded-2xl bg-white p-5 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">จดการคุยกับลูกค้า</h3>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 text-gray-400 hover:bg-gray-100" aria-label="ปิด">
                <X size={16} />
              </button>
            </div>

            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาลูกค้า" className={cn(field, "pl-8")} />
            </div>
            <div className="mb-3 max-h-40 min-h-[3rem] overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {shown.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setClientId(c.id)}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-3 py-1 text-sm",
                      clientId === c.id ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 text-gray-700 hover:bg-gray-50",
                    )}
                  >
                    {clientId === c.id && <Check size={12} />}
                    {c.name}
                  </button>
                ))}
                {clients.length === 0 && <span className="text-sm text-gray-400">กำลังโหลดรายชื่อ…</span>}
              </div>
            </div>

            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500">
              ใครคุย
              <select value={by} onChange={(e) => setBy(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-700">
                <option value="">ไม่ระบุ</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <span className="ml-auto flex items-center gap-1.5">
                วันที่คุย
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-700" />
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && save()}
              rows={4}
              autoFocus
              placeholder="คุยอะไรกับลูกค้า… (Cmd/Ctrl+Enter เพื่อบันทึก)"
              className={field}
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-400">{clientId ? `ลูกค้า: ${clients.find((c) => c.id === clientId)?.name}` : "เลือกลูกค้าก่อน"}</span>
              <button
                onClick={save}
                disabled={!clientId || !text.trim() || saving}
                className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40"
              >
                {saving ? "กำลังบันทึก…" : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
