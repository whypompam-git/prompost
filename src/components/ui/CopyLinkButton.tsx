"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API unavailable/denied — fall back to the classic
    // hidden-textarea + execCommand trick, which works in more contexts.
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyLinkButton({ path, label }: { path: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    const url = `${window.location.origin}${path}`;
    const ok = await copyText(url);
    setState(ok ? "copied" : "failed");
    setTimeout(() => setState("idle"), 1500);
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-1.5 truncate rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
        state === "copied" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        state === "failed" && "border-rose-200 bg-rose-50 text-rose-600",
        state === "idle" && "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700",
      )}
    >
      {state === "copied" ? (
        <Check size={12} className="shrink-0" />
      ) : (
        <Copy size={12} className="shrink-0" />
      )}
      <span className="truncate">
        {state === "copied" ? "คัดลอกแล้ว" : state === "failed" ? "คัดลอกไม่สำเร็จ ลองใหม่" : label}
      </span>
    </button>
  );
}
