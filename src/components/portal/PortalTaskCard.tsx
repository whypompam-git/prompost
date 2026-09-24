"use client";

import { useState } from "react";
import { Camera, ChevronDown, Film, ListChecks, ScrollText } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScriptText } from "@/components/ui/ScriptText";
import type { TaskStatus, TaskType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  shoot: "ถ่ายทำ",
  edit: "ตัดต่อ",
  review: "ตรวจสอบ",
  deliver: "ส่งมอบ",
  other: "อื่นๆ",
};

export function PortalTaskCard({
  title,
  type,
  status,
  scriptText,
  footageUrl,
  finalUrl,
  equipment,
  shots,
}: {
  title: string;
  type: TaskType;
  status: TaskStatus;
  scriptText: string | null;
  footageUrl: string | null;
  finalUrl: string | null;
  equipment: string[];
  shots: string[];
}) {
  const [open, setOpen] = useState(false);
  const hasScript = Boolean(scriptText?.trim());
  const expandable = hasScript || shots.length > 0 || footageUrl || finalUrl;

  return (
    <div className="rounded-xl bg-gray-50">
      <button
        type="button"
        onClick={() => expandable && setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 px-4 py-3 text-left",
          expandable && "cursor-pointer",
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-800">{title}</p>
          <p className="text-xs text-gray-400">{TYPE_LABEL[type] ?? type}</p>
          {equipment.length > 0 && (
            <p className="mt-1 flex items-start gap-1 text-xs text-gray-500">
              <Camera size={12} className="mt-0.5 shrink-0" />
              <span>เตรียม: {equipment.join(", ")}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={status} />
          {expandable && (
            <ChevronDown size={15} className={cn("text-gray-400 transition", open && "rotate-180")} />
          )}
        </div>
      </button>

      {open && expandable && (
        <div className="space-y-3 border-t border-gray-100 px-4 py-3">
          {shots.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                <ListChecks size={12} />
                Shot list
              </p>
              <ul className="list-inside list-decimal space-y-0.5 rounded-lg bg-white p-3 text-sm text-gray-700">
                {shots.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {hasScript && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                <ScrollText size={12} />
                สคริปต์
              </p>
              <ScriptText text={scriptText!} className="rounded-lg bg-white p-3 text-sm text-gray-700" />
            </div>
          )}
          {(footageUrl || finalUrl) && (
            <div className="flex flex-wrap gap-2">
              {footageUrl && (
                <a
                  href={footageUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  <Film size={13} />
                  ดู Footage
                </a>
              )}
              {finalUrl && (
                <a
                  href={finalUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  <Film size={13} />
                  ดูวิดีโอ Final
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
