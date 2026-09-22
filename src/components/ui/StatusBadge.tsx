import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/types";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "ต้องทำ",
  in_progress: "กำลังทำ",
  review: "ตรวจสอบ",
  done: "เสร็จแล้ว",
};

const STATUS_STYLE: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-600",
  in_progress: "bg-sky-100 text-sky-700",
  review: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        STATUS_STYLE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
