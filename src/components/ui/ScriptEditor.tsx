"use client";

import { useRef } from "react";
import { Bold, Underline } from "lucide-react";

// Plain textarea + a toolbar that wraps the current selection in **bold**
// or __underline__ markers — the same markers ScriptText knows how to
// render. No contentEditable/HTML involved, so nothing to sanitize.
export function ScriptEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(marker: string) {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    const before = value.slice(0, selectionStart);
    const selected = value.slice(selectionStart, selectionEnd);
    const after = value.slice(selectionEnd);
    const next = `${before}${marker}${selected || "ข้อความ"}${marker}${after}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = selectionStart + marker.length + (selected || "ข้อความ").length + marker.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div>
      <div className="mb-1.5 flex gap-1">
        <button
          type="button"
          onClick={() => wrapSelection("**")}
          className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
          aria-label="ตัวหนา"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onClick={() => wrapSelection("__")}
          className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
          aria-label="ขีดเส้นใต้"
        >
          <Underline size={14} />
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        placeholder="พิมพ์สคริปต์ที่นี่ — เลือกข้อความแล้วกดปุ่มด้านบนเพื่อทำตัวหนา/ขีดเส้นใต้"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-300"
      />
    </div>
  );
}
