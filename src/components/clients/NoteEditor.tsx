"use client";

import { useRef, useState } from "react";
import { Highlighter, ImagePlus, Bold, Loader2, X } from "lucide-react";
import { uploadNoteImage } from "@/lib/supabase/queries";
import { wrapSelection } from "@/lib/noteMarkup";
import { cn } from "@/lib/utils";

// Textarea for conversation notes: B / highlight buttons wrap the selection
// in **bold** / ==highlight==, and pictures can be attached (button, drag-drop
// or paste a screenshot).
export function NoteEditor({
  value,
  onChange,
  images,
  onImagesChange,
  rows = 4,
  autoFocus,
  placeholder,
  onSubmit,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  images: string[];
  onImagesChange: (urls: string[]) => void;
  rows?: number;
  autoFocus?: boolean;
  placeholder?: string;
  onSubmit?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);

  function wrap(mark: "**" | "==") {
    const el = ref.current;
    if (!el) return;
    const r = wrapSelection(value, el.selectionStart, el.selectionEnd, mark);
    onChange(r.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(r.selStart, r.selEnd);
    });
  }

  async function addFiles(files: File[]) {
    const pics = files.filter((f) => f.type.startsWith("image/"));
    if (pics.length === 0) return;
    setUploading((n) => n + pics.length);
    const urls: string[] = [];
    for (const f of pics) {
      try {
        urls.push(await uploadNoteImage(f));
      } catch {
        window.alert(`อัปโหลดรูป "${f.name || "ภาพที่วาง"}" ไม่สำเร็จ`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (urls.length) onImagesChange([...images, ...urls]);
  }

  const tool = "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100";
  return (
    <div className={cn("rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-brand-300", className)}>
      <div className="flex items-center gap-1 border-b border-gray-100 px-1.5 py-1">
        <button type="button" onClick={() => wrap("**")} className={tool} title="ตัวหนา (เลือกข้อความก่อน)">
          <Bold size={13} /> หนา
        </button>
        <button type="button" onClick={() => wrap("==")} className={cn(tool, "text-amber-700")} title="ไฮไลต์ข้อความสำคัญ (เลือกข้อความก่อน)">
          <Highlighter size={13} /> ไฮไลต์
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={tool} title="แนบรูป (หรือวาง/ลากรูปลงในช่อง)">
          <ImagePlus size={13} /> แนบรูป
        </button>
        {uploading > 0 && (
          <span className="ml-1 flex items-center gap-1 text-xs text-gray-400">
            <Loader2 size={12} className="animate-spin" /> กำลังอัปโหลด {uploading}
          </span>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && onSubmit?.()}
        onPaste={(e) => {
          const files = [...e.clipboardData.files];
          if (files.some((f) => f.type.startsWith("image/"))) {
            e.preventDefault();
            addFiles(files);
          }
        }}
        onDrop={(e) => {
          if ([...e.dataTransfer.files].some((f) => f.type.startsWith("image/"))) {
            e.preventDefault();
            addFiles([...e.dataTransfer.files]);
          }
        }}
        rows={rows}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="w-full resize-y rounded-b-lg px-3 py-2 text-sm focus:outline-none"
      />
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-gray-100 p-2">
          {images.map((url) => (
            <div key={url} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-16 w-16 rounded-lg border border-gray-200 object-cover" />
              <button
                type="button"
                onClick={() => onImagesChange(images.filter((u) => u !== url))}
                className="absolute -right-1.5 -top-1.5 hidden rounded-full bg-gray-800 p-0.5 text-white group-hover:block"
                aria-label="เอารูปออก"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
