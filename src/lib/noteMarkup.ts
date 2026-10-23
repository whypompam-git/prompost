// Client-note formatting: **bold** and ==highlight==. Plain text stays plain
// (so old notes and the list preview keep working); rendering builds React
// nodes from these segments, never raw HTML.
export type NoteSegment = { text: string; bold?: boolean; mark?: boolean };

export function parseNote(text: string): NoteSegment[] {
  const out: NoteSegment[] = [];
  const re = /\*\*([\s\S]+?)\*\*|==([\s\S]+?)==/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push(m[1] !== undefined ? { text: m[1], bold: true } : { text: m[2], mark: true });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

// for one-line previews
export const stripNoteMarkup = (text: string) => text.replace(/\*\*([\s\S]+?)\*\*|==([\s\S]+?)==/g, (_, a, b) => a ?? b);

// wraps the selected text (or inserts a placeholder) and returns the new value + selection
export function wrapSelection(value: string, start: number, end: number, mark: "**" | "==") {
  const picked = value.slice(start, end) || "ข้อความสำคัญ";
  const next = `${value.slice(0, start)}${mark}${picked}${mark}${value.slice(end)}`;
  return { value: next, selStart: start + mark.length, selEnd: start + mark.length + picked.length };
}
