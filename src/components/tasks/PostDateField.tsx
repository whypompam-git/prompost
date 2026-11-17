"use client";

import { cn } from "@/lib/utils";

// When a clip is posted and by whom: the date can be a day in the future (the planned post
// day, set by us or by the client from their link); "ลูกค้าโพสเอง" marks clips the client posts.
export function PostDateField({
  postDate,
  postBy,
  onChange,
  compact = false,
}: {
  postDate?: string;
  postBy?: "us" | "client";
  onChange: (patch: { postDate?: string; postBy?: "us" | "client" }) => void;
  compact?: boolean;
}) {
  const by = postBy ?? "us";
  return (
    <div className={cn("flex items-center gap-1.5", compact ? "flex-wrap text-[10px] text-gray-400" : "flex-wrap")}>
      <input
        type="date"
        value={postDate ?? ""}
        onChange={(e) => onChange({ postDate: e.target.value || undefined })}
        className={compact ? "rounded border border-gray-200 px-1 py-0.5 text-[11px] text-gray-700 focus:outline-none" : "rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"}
      />
      <span className="inline-flex overflow-hidden rounded-lg border border-gray-200 text-xs font-medium">
        {([["us", "เราโพส"], ["client", "ลูกค้าโพส"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => onChange({ postBy: k })} className={cn("px-2 py-1", by === k ? "bg-brand-500 text-white" : "bg-white text-gray-500")}>
            {label}
          </button>
        ))}
      </span>
    </div>
  );
}
