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
    <Card className="flex items-center gap-4">
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", toneStyle[tone])}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-semibold leading-none text-gray-900">{value}</p>
        <p className="mt-1 text-sm text-gray-500">{label}</p>
      </div>
    </Card>
  );
}
