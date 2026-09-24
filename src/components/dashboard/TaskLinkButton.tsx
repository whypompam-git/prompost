"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 500;

const withScheme = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

// Empty → first tap asks for the link and confirms it. Filled → tap opens the
// link, press-and-hold reopens the editor.
export function TaskLinkButton({
  label,
  url,
  onSave,
}: {
  label: string;
  url?: string;
  onSave: (url: string | undefined) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  function openEditor() {
    setDraft(url ?? "");
    setEditing(true);
  }

  function startPress() {
    longPressed.current = false;
    if (!url) return;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      openEditor();
    }, LONG_PRESS_MS);
  }

  function endPress() {
    if (timer.current) clearTimeout(timer.current);
  }

  function handleClick() {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    if (!url) return openEditor();
    window.open(withScheme(url), "_blank", "noopener,noreferrer");
  }

  function confirm() {
    const value = draft.trim();
    onSave(value ? value : undefined);
    setEditing(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onPointerCancel={endPress}
        onContextMenu={(e) => {
          e.preventDefault();
          if (url) openEditor();
        }}
        title={url ? "กดเพื่อเปิดลิงก์ / กดค้างเพื่อแก้ไข" : `เพิ่มลิงก์ ${label}`}
        className={cn(
          "flex select-none items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium",
          url
            ? "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
            : "border-dashed border-gray-300 text-gray-400 hover:border-brand-300 hover:text-brand-600",
        )}
      >
        {url ? <ExternalLink size={11} /> : <Plus size={11} />}
        {label}
      </button>

      {editing &&
        createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-base font-semibold text-gray-900">ลิงก์ {label}</h3>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirm()}
              placeholder="วางลิงก์ที่นี่ เช่น https://drive.google.com/..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <div className="mt-4 flex items-center justify-between gap-2">
              {url ? (
                <button
                  onClick={() => {
                    onSave(undefined);
                    setEditing(false);
                  }}
                  className="text-xs font-medium text-rose-500 hover:underline"
                >
                  ลบลิงก์
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirm}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
