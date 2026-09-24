"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { Client } from "@/lib/types";
import { cn } from "@/lib/utils";

// Tick-to-select filter: empty selection means "all clients".
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const label =
    selected.length === 0
      ? "ลูกค้าทั้งหมด"
      : selected.length === 1
        ? (clients.find((c) => c.id === selected[0])?.name ?? "1 ราย")
        : `เลือก ${selected.length} ราย`;

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[210px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={15} className={cn("shrink-0 text-gray-400 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="pp-pop-menu absolute left-0 top-11 z-30 w-64 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-xs">
            <span className="font-medium text-gray-500">เลือกได้หลายราย</span>
            <button onClick={() => onChange([])} className="font-medium text-brand-600 hover:underline">
              ดูทั้งหมด
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {clients.map((c) => {
              const on = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                      on ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300",
                    )}
                  >
                    {on && <Check size={13} />}
                  </span>
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
