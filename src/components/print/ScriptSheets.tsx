"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { ScriptText } from "@/components/ui/ScriptText";

export type SheetTask = {
  id: string;
  title: string;
  client: string;
  queue: string;
  stage: string;
  status: string;
  category: string;
  shootDate: string | null;
  editDate: string | null;
  script: string;
  shots: string[];
  equipment: string[];
  notes: string;
};

const CATEGORY: Record<string, string> = { mass: "Mass", royalty: "Royalty", sell: "Sell" };
const thDate = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }) : "—");

// One A4 page per clip. The script text shrinks until the whole page fits on a
// single sheet; the QR opens the clip (staff login) so status / edits are quick on a phone.
function Sheet({ t, qr }: { t: SheetTask; qr: string }) {
  const body = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(15);

  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    let s = 17;
    el.style.fontSize = `${s}px`;
    while (el.scrollHeight > el.clientHeight + 1 && s > 7) {
      s -= 0.5;
      el.style.fontSize = `${s}px`;
    }
    setSize(s);
  }, [t.script, t.shots, t.equipment, t.notes]);

  return (
    <section className="sheet mx-auto mb-6 flex h-[297mm] w-[210mm] flex-col overflow-hidden bg-white px-[14mm] py-[12mm] text-gray-900 shadow print:mb-0 print:shadow-none" style={{ fontFamily: "var(--font-prompt)" }}>
      <header className="flex items-start gap-4 border-b-2 border-gray-800 pb-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500">
            {t.client}
            {t.queue ? ` · ${t.queue}` : ""}
          </p>
          <h1 className="text-2xl font-bold leading-tight">{t.title}</h1>
          <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-gray-600">
            <span>ขั้นตอน: <b>{t.stage}</b> ({t.status})</span>
            {t.category && <span>หมวด: <b>{CATEGORY[t.category] ?? t.category}</b></span>}
            <span>ถ่าย: {thDate(t.shootDate)}</span>
            <span>ตัดต่อ/ส่ง: {thDate(t.editDate)}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center">
          {qr && /* eslint-disable-next-line @next/next/no-img-element */ <img src={qr} alt="QR" className="h-[30mm] w-[30mm]" />}
          <span className="mt-0.5 text-[10px] text-gray-400">สแกนเพื่อแก้ไข/อัปเดตสถานะ</span>
        </div>
      </header>

      <div ref={body} className="mt-3 min-h-0 flex-1 overflow-hidden leading-relaxed" style={{ fontSize: size }}>
        {t.script.trim() ? <ScriptText text={t.script} /> : <p className="text-gray-400">(ยังไม่มีสคริปต์)</p>}
        {(t.shots.length > 0 || t.equipment.length > 0 || t.notes) && (
          <div className="mt-3 space-y-1 border-t border-gray-300 pt-2 text-[0.85em]">
            {t.shots.length > 0 && <p><b>มุม/ช็อต:</b> {t.shots.join(" · ")}</p>}
            {t.equipment.length > 0 && <p><b>อุปกรณ์:</b> {t.equipment.join(" · ")}</p>}
            {t.notes && <p className="whitespace-pre-wrap"><b>โน้ต:</b> {t.notes}</p>}
          </div>
        )}
      </div>
    </section>
  );
}

export function ScriptSheets({ sheets }: { sheets: SheetTask[] }) {
  const [qrs, setQrs] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all(
      sheets.map(async (s) => [s.id, await QRCode.toDataURL(`${window.location.origin}/tasks/${s.id}`, { margin: 1, width: 240 })] as const),
    ).then((pairs) => setQrs(Object.fromEntries(pairs)));
  }, [sheets]);

  return (
    <div className="min-h-screen bg-gray-100 py-4 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 0 } @media print { .sheet { break-after: page; } .sheet:last-child { break-after: auto; } }`}</style>
      <div className="no-print mx-auto mb-4 flex w-[210mm] max-w-full items-center justify-between px-2">
        <p className="text-sm text-gray-600">{sheets.length} คลิป · 1 คลิปต่อ 1 หน้า A4 (ตัวอักษรย่อให้พอดีหน้าอัตโนมัติ)</p>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
          <Printer size={15} /> พิมพ์
        </button>
      </div>
      {sheets.map((s) => (
        <Sheet key={s.id} t={s} qr={qrs[s.id] ?? ""} />
      ))}
    </div>
  );
}
