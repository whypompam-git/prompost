"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { Client } from "@/lib/types";
import { cn } from "@/lib/utils";

// Opens a pop-up with every client shown at once (no scrolling through a
// narrow list). Tap names to toggle; empty selection means "all clients".
export function ClientMultiFilter({
  clients,
  selected,
  onChange,
}: {
  clients: Client[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const label =
    selected.length === 0
      ? "ลูกค้าทั้งหมด"
      : selected.length === 1
        ? (clients.find((c) => c.id === selected[0])?.name ?? "1 ราย")
        : `เลือก ${selected.length} ราย`;

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  const q = query.trim().toLowerCase();
  const shown = q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients;

  return (
    <>
      <button
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
        className="flex max-w-[210px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={15} className="shrink-0 text-gray-400" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onMouseDown={() => setOpen(false)}>
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-5 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">เลือกลูกค้า</h3>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 text-gray-400 hover:bg-gray-100" aria-label="ปิด">
                <X size={16} />
              </button>
            </div>
            <div className="mb-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาชื่อลูกค้า"
                  className="w-full rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <button onClick={() => onChange([])} className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-gray-50">
                ดูทั้งหมด
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {shown.map((c) => {
                  const on = selected.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggle(c.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition",
                        on ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                      )}
                    >
                      {on && <Check size={13} />}
                      {c.name}
                    </button>
                  );
                })}
                {shown.length === 0 && <p className="py-6 text-sm text-gray-400">ไม่พบลูกค้าที่ค้นหา</p>}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {selected.length === 0 ? "แสดงทุกลูกค้า" : `เลือกอยู่ ${selected.length} จาก ${clients.length} ราย`}
              </span>
              <button onClick={() => setOpen(false)} className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600">
                เสร็จ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
