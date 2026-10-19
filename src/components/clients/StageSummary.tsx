import { cn } from "@/lib/utils";
import { summarizeStages } from "@/lib/workflow";

const TONE: Record<string, string> = {
  plan: "bg-violet-50 text-violet-700",
  shoot: "bg-sky-50 text-sky-700",
  edit: "bg-amber-50 text-amber-700",
  pending: "bg-rose-50 text-rose-700",
  approved: "bg-emerald-50 text-emerald-700",
  posted: "bg-teal-50 text-teal-700",
};

// "ทั้งหมด 24 คลิป · Plan 3 · ถ่าย 5 · ..." at a glance.
export function StageSummary({
  tasks,
  compact = false,
  onPick,
  active,
}: {
  tasks: { type: string }[];
  compact?: boolean;
  onPick?: (key: string | null) => void;
  active?: string | null;
}) {
  const { total, groups } = summarizeStages(tasks);
  return (
    <div className={cn("flex flex-wrap items-center", compact ? "gap-1" : "gap-2")}>
      <button
        type="button"
        onClick={() => onPick?.(null)}
        className={cn(
          "rounded-full font-medium",
          compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-sm",
          active == null ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700",
          !onPick && "cursor-default",
        )}
      >
        ทั้งหมด {total} คลิป
      </button>
      {groups.map((g) => (
        <button
          key={g.key}
          type="button"
          onClick={() => onPick?.(active === g.key ? null : g.key)}
          className={cn(
            "rounded-full font-medium",
            compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-sm",
            TONE[g.key],
            active === g.key && "ring-2 ring-gray-700",
            g.count === 0 && "opacity-40",
            !onPick && "cursor-default",
          )}
        >
          {g.label} {g.count}
        </button>
      ))}
    </div>
  );
}
