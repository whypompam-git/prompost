"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

// A message ready to paste into LINE: shown as it will look, editable before copying, one tap to copy.
export function LineCopyBox({ label, text, onCopied }: { label: string; text: string; onCopied?: () => void }) {
  const [value, setValue] = useState(text);
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  // follow the source text again when the clip changes underneath
  const [src, setSrc] = useState(text);
  if (src !== text) {
    setSrc(text);
    setValue(text);
  }

  async function copy() {
    const ok = await copyToClipboard(value);
    setState(ok ? "copied" : "failed");
    if (ok) onCopied?.();
    setTimeout(() => setState("idle"), 1800);
  }

  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
          <MessageCircle size={13} /> {label}
        </p>
        <button
          onClick={copy}
          className={cn(
            "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold",
            state === "copied" ? "bg-emerald-600 text-white" : state === "failed" ? "bg-rose-500 text-white" : "bg-emerald-500 text-white hover:bg-emerald-600",
          )}
        >
          {state === "copied" ? <Check size={13} /> : <Copy size={13} />}
          {state === "copied" ? "คัดลอกแล้ว" : state === "failed" ? "คัดลอกไม่ได้" : "คัดลอกไป LINE"}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={Math.min(14, Math.max(4, value.split("\n").length + 1))}
        className="mt-2 w-full resize-y rounded-lg border border-emerald-100 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}
