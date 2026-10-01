"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { Staff } from "@/lib/types";
import { cn } from "@/lib/utils";

// Single-select "ดูงานของ": empty selection means "everyone".
export function StaffFilter({
  staff,
  selected,
  onChange,
}: {
  staff: Staff[];
  selected: string;
  onChange: (id: string) => void;
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

  const label = selected ? (staff.find((s) => s.id === selected)?.name ?? "พนักงาน") : "ทุกคน";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[180px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
      >
        <span className="truncate">ดูงานของ: {label}</span>
        <ChevronDown size={15} className={cn("shrink-0 text-gray-400 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="pp-pop-menu absolute left-0 top-11 z-30 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="max-h-72 overflow-y-auto py-1">
            <button
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                  !selected ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300",
                )}
              >
                {!selected && <Check size={13} />}
              </span>
              <span>ทุกคน</span>
            </button>
            {staff.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onChange(s.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                    selected === s.id ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300",
                  )}
                >
                  {selected === s.id && <Check size={13} />}
                </span>
                <span className="truncate">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
