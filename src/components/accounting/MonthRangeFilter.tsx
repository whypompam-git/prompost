"use client";

import { cn } from "@/lib/utils";

// "YYYY-MM" month pickers for a from/to range, plus a one-tap "all time" escape.
export function MonthRangeFilter({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const allTime = !from && !to;
  const thisMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <input
        type="month"
        value={from}
        onChange={(e) => onChange(e.target.value, to)}
        className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700"
      />
      <span className="text-gray-400">ถึง</span>
      <input
        type="month"
        value={to}
        onChange={(e) => onChange(from, e.target.value)}
        className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-700"
      />
      <button
        onClick={() => onChange(thisMonth, thisMonth)}
        className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        เดือนนี้
      </button>
      <button
        onClick={() => onChange("", "")}
        className={cn(
          "rounded-lg border px-2.5 py-1.5 text-xs font-medium",
          allTime ? "border-brand-300 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600 hover:bg-gray-50",
        )}
      >
        ทั้งหมด
      </button>
    </div>
  );
}
