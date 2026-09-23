export function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "gray" | "emerald" | "sky" | "amber";
}) {
  const toneStyle: Record<string, string> = {
    gray: "bg-white text-gray-900",
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className={`rounded-2xl border border-gray-100 p-4 text-center shadow-card ${toneStyle[tone]}`}>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}
