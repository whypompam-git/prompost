// Copy-paste messages for LINE: the system writes the message, a person pastes it into the
// right chat. Pure (and tested) — no sending, no quota.

export type LineTaskCtx = {
  clientName: string;
  title: string;
  stage: string; // tasks.type: plan | shoot | edit | qc | pending | approved | posted | rejected
  editorName?: string | null;
  assigneeName?: string | null;
  editDate?: string | null; // ISO date
  footageUrl?: string | null;
  refLink?: string | null;
  finalUrl?: string | null;
  notes?: string | null;
  scriptText?: string | null;
  revisionCount?: number;
  revisionBrief?: string | null;
  link?: string | null; // the clip's page in the system
};

export type LineText = { key: string; label: string; text: string };

const dateTh = (iso?: string | null) =>
  iso ? new Date(`${iso}T12:00:00+07:00`).toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" }) : "";
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
const line = (label: string, v?: string | null) => (v && v.trim() ? `${label}: ${v.trim()}` : null);
const join = (parts: (string | null | undefined | false)[]) => parts.filter((p): p is string => Boolean(p)).join("\n");

// Which messages make sense for this clip right now (most relevant first).
export function lineTextsForTask(c: LineTaskCtx): LineText[] {
  const who = `${c.clientName} · ${c.title}`;
  const out: LineText[] = [];
  const revising = (c.revisionCount ?? 0) > 0 && !!c.revisionBrief?.trim();

  if (c.stage === "edit") {
    if (revising) {
      out.push({
        key: "revise",
        label: "สั่งแก้ ส่งให้ Editor",
        text: join([
          `✏️ ขอแก้ (รอบที่ ${c.revisionCount}): ${who}`,
          c.editorName && `ถึง: ${c.editorName}`,
          line("กำหนดส่งตัด", dateTh(c.editDate)),
          "",
          "สิ่งที่ต้องแก้:",
          c.revisionBrief!.trim(),
          "",
          line("ฟุตเทจ", c.footageUrl),
          line("ดูงานในระบบ", c.link),
        ]),
      });
    }
    out.push({
      key: "assign",
      label: "มอบงานตัดต่อ",
      text: join([
        `🎬 งานตัดต่อ: ${who}`,
        c.editorName && `ถึง: ${c.editorName}`,
        line("กำหนดส่ง", dateTh(c.editDate)),
        line("ฟุตเทจ", c.footageUrl),
        line("ตัวอย่างอ้างอิง", c.refLink),
        c.notes?.trim() && `หมายเหตุ: ${clip(c.notes.trim(), 400)}`,
        c.scriptText?.trim() && `\nสคริปต์:\n${clip(c.scriptText.trim(), 900)}`,
        line("\nดูงานในระบบ", c.link),
      ]),
    });
  }

  if (c.stage === "qc") {
    out.push({
      key: "qc_ready",
      label: "ตัดเสร็จ รอตรวจ QC",
      text: join([`👀 ตัดเสร็จ รอตรวจ QC: ${who}`, c.assigneeName && `ถึง: ${c.assigneeName}`, line("ดูงานในระบบ", c.link)]),
    });
  }

  if (c.stage === "pending") {
    out.push({
      key: "sent_client",
      label: "ส่งให้ลูกค้าตรวจแล้ว",
      text: join([`📤 ผ่าน QC ส่งให้ลูกค้าตรวจแล้ว: ${who}`, line("ดูงานในระบบ", c.link)]),
    });
  }

  if ((c.stage === "approved" || c.stage === "posted") && !c.finalUrl?.trim()) {
    out.push({
      key: "approved",
      label: "ลูกค้าอนุมัติ ส่ง Drive",
      text: join([
        `✅ ลูกค้าอนุมัติแล้ว: ${who}`,
        c.editorName && `ถึง: ${c.editorName}`,
        "ส่งไฟล์ Final ขึ้น Drive แล้ววางลิงก์ในระบบด้วยนะครับ",
        line("ดูงานในระบบ", c.link),
      ]),
    });
  }

  if (c.finalUrl?.trim()) {
    out.push({
      key: "final",
      label: "ส่งไฟล์ Final ให้ลูกค้า",
      text: join([`📦 ไฟล์ Final พร้อมแล้ว: ${who}`, line("ลิงก์ไฟล์", c.finalUrl)]),
    });
  }

  if (c.stage === "shoot") {
    out.push({
      key: "shoot",
      label: "แจ้งทีมถ่าย",
      text: join([`🎥 คลิปรอถ่าย: ${who}`, c.assigneeName && `ผู้ดูแล: ${c.assigneeName}`, c.scriptText?.trim() && `\nสคริปต์:\n${clip(c.scriptText.trim(), 900)}`, line("\nดูงานในระบบ", c.link)]),
    });
  }
  return out;
}
