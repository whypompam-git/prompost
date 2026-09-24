"use client";

import { useEffect, useRef } from "react";
import { Bold, Underline } from "lucide-react";

// Rich (what-you-type-is-what-you-see) editor. Stored value stays plain text
// with **bold** / __underline__ markers, so ScriptText renders it unchanged.
// DOM is built with createElement/textContent only — no innerHTML.
function buildDom(root: HTMLElement, value: string) {
  root.textContent = "";
  const pattern = /\*\*(.+?)\*\*|__(.+?)__/g;
  const lines = value.split("\n");
  lines.forEach((line, i) => {
    if (i > 0) root.appendChild(document.createElement("br"));
    let last = 0;
    let m: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(line))) {
      if (m.index > last) root.appendChild(document.createTextNode(line.slice(last, m.index)));
      const el = document.createElement(m[1] !== undefined ? "b" : "u");
      el.textContent = m[1] ?? m[2];
      root.appendChild(el);
      last = pattern.lastIndex;
    }
    if (last < line.length) root.appendChild(document.createTextNode(line.slice(last)));
  });
}

function serialize(root: HTMLElement): string {
  let out = "";
  let started = false;
  const walk = (node: Node, bold: boolean, underline: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? "").replace(/ /g, " ");
      if (!t) return;
      started = true;
      if (bold) out += `**${t}**`;
      else if (underline) out += `__${t}__`;
      else out += t;
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName;
    if (tag === "BR") {
      out += "\n";
      started = true;
      return;
    }
    const isBlock = tag === "DIV" || tag === "P";
    if (isBlock) {
      if (started) out += "\n";
      started = true;
    }
    const b = bold || tag === "B" || tag === "STRONG" || Number(node.style.fontWeight) >= 600 || node.style.fontWeight === "bold";
    const u = underline || tag === "U" || node.style.textDecoration.includes("underline");
    node.childNodes.forEach((c, idx) => {
      if (isBlock && c.nodeName === "BR" && idx === node.childNodes.length - 1) return;
      walk(c, b, u);
    });
  };
  root.childNodes.forEach((c) => walk(c, false, false));
  return out;
}

export function ScriptEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) buildDom(ref.current, value);
    // initial value only; the DOM is the source of truth while editing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function format(cmd: "bold" | "underline") {
    ref.current?.focus();
    document.execCommand(cmd);
    if (ref.current) onChange(serialize(ref.current));
  }

  return (
    <div>
      <div className="mb-1.5 flex gap-1">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => format("bold")}
          className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
          aria-label="ตัวหนา"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => format("underline")}
          className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50"
          aria-label="ขีดเส้นใต้"
        >
          <Underline size={14} />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(serialize(e.currentTarget))}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
        }}
        className="min-h-[10rem] w-full whitespace-pre-wrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-300"
      />
    </div>
  );
}
