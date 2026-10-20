"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { PALETTE, pillClass, type ColorStem } from "@/lib/colors";
import type { CalendarChip, ChipGroup } from "@/lib/calendarChips";
import type { Client } from "@/lib/types";
import { cn } from "@/lib/utils";

const GROUP_COLOR: Record<ChipGroup, ColorStem> = { shoot: "sky", edit: "orange", send: "rose", other: "gray" };

// One day = the summary chips of that day, grouped by client.
export function DayView({
  date,
  chips,
  clients,
  onAddTask,
}: {
  date: Date;
  chips: CalendarChip[];
  clients: Client[];
  onAddTask?: (dateIso: string) => void;
}) {
  const dateIso = date.toISOString().slice(0, 10);
  const groups = clients
    .map((c) => ({ client: c, chips: chips.filter((x) => x.clientId === c.id) }))
    .filter((g) => g.chips.length > 0);

  return (
    <div className="space-y-3">
      {groups.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400 shadow-card">
          วันนี้ไม่มีงานในปฏิทิน
        </div>
      )}
      {groups.map(({ client, chips: list }) => (
        <div key={client.id} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-card">
          <p className="mb-2 text-sm font-semibold text-gray-800">{client.name}</p>
          <div className="flex flex-wrap gap-2">
            {list.map((chip) => (
              <Link
                key={chip.key}
                href={chip.href}
                className={cn("flex flex-col rounded-lg px-3 py-2 text-xs font-medium hover:brightness-95", pillClass(GROUP_COLOR[chip.group]))}
              >
                <span className="flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", PALETTE[GROUP_COLOR[chip.group]].solid)} />
                  {chip.label}
                </span>
                {chip.group !== "other" && (
                  <span className="pl-3 font-normal opacity-80">
                    {chip.count} คลิป{chip.crew.length > 0 && ` · ${chip.crew.join(", ")}`}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
      {onAddTask && (
        <button onClick={() => onAddTask(dateIso)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600">
          <Plus size={13} /> เพิ่มงาน
        </button>
      )}
    </div>
  );
}
