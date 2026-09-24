import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "gray",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "gray" | "orange" | "sky" | "amber" | "emerald";
}) {
  const toneStyle: Record<string, string> = {
    gray: "bg-gray-100 text-gray-600",
    orange: "bg-brand-100 text-brand-600",
    sky: "bg-sky-100 text-sky-600",
    amber: "bg-amber-100 text-amber-600",
    emerald: "bg-emerald-100 text-emerald-600",
  };

  return (
    <Card className="flex items-center gap-3 !p-3 sm:gap-4 sm:!p-5">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11", toneStyle[tone])}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xl font-semibold leading-none text-gray-900 sm:text-2xl">{value}</p>
        <p className="mt-1 text-xs text-gray-500 sm:text-sm">{label}</p>
      </div>
    </Card>
  );
}
