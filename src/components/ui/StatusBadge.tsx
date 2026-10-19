import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/types";
import { statusLabel } from "@/lib/workflow";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "ToDo",
  in_progress: "กำลังทำ",
  review: "In Review",
  done: "Done",
  waiting: "รอลูกค้า",
};

const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-600",
  in_progress: "bg-sky-100 text-sky-700",
  review: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
  waiting: "bg-violet-100 text-violet-700",
};

// `stage` (tasks.type) gives the status its stage-specific wording, e.g.
// "รอลูกค้าอนุมัติ" for Pending or "รอโพส" for an approved clip.
export function StatusBadge({ status, stage }: { status: TaskStatus; stage?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_STYLE[status],
      )}
    >
      {stage ? statusLabel(stage, status) : STATUS_LABEL[status]}
    </span>
  );
}
