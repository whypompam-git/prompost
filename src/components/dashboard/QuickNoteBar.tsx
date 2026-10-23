"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { createClientNoteRow } from "@/lib/supabase/queries";
import type { Client, Staff } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

// One-line "just talked to a client" note, always at the top of the dashboard:
// pick the client, type, save. The same entries show in each client's history.
export function QuickNoteBar({ clients, staff, onSaved }: { clients: Client[]; staff: Staff[]; onSaved: (msg: string) => void }) {
  const auth = useAuth();
  const [clientId, setClientId] = useState("");
  const [by, setBy] = useState(auth.staffId);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!clientId || !text.trim() || saving) return;
    setSaving(true);
    try {
      await createClientNoteRow(clientId, text.trim(), today(), by || null);
      onSaved(`บันทึกการคุยกับ ${clients.find((c) => c.id === clientId)?.name ?? "ลูกค้า"} แล้ว`);
      setText("");
    } catch {
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  const field = "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300";
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-card">
      <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
        <MessageSquarePlus size={16} className="text-brand-500" />
        จดการคุย
      </span>
      <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={`${field} max-w-[190px]`} aria-label="ลูกค้า">
        <option value="">เลือกลูกค้า…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select value={by} onChange={(e) => setBy(e.target.value)} className={`${field} max-w-[130px]`} aria-label="ใครคุย" title="ใครคุย">
        <option value="">ไม่ระบุคนคุย</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        placeholder="คุยอะไรกับลูกค้า… (กด Enter เพื่อบันทึก)"
        className={`${field} min-w-[200px] flex-1`}
      />
      <button
        onClick={save}
        disabled={!clientId || !text.trim() || saving}
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-40"
      >
        {saving ? "กำลังบันทึก…" : "บันทึก"}
      </button>
    </div>
  );
}
