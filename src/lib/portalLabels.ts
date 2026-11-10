// What the CLIENT sees. The team's internal stages (QC, Pending, ToDo, In Review…)
// mean nothing to a client, so the client link speaks only in these terms.
// Pure + unit-tested.

export type ClientState = {
  key: "plan" | "check" | "revised" | "making" | "approved" | "posted" | "rejected";
  label: string; // short badge
  hint: string; // one plain sentence: what is happening / what to do
  tone: "action" | "wait" | "done" | "muted"; // action = the client must do something
};

export function clientState(t: { type: string; revisionCount?: number | null }): ClientState {
  const revised = (t.revisionCount ?? 0) > 0;
  switch (t.type) {
    case "plan":
      return { key: "plan", label: "รอคุณเลือก", hint: "แผนคอนเทนต์นี้ ใช้เลย / ขอแก้ / ไม่ใช้", tone: "action" };
    case "pending":
      return { key: "check", label: "รอคุณตรวจ", hint: "คลิปตัดต่อเสร็จแล้ว กด ผ่าน หรือ แก้ไข", tone: "action" };
    case "shoot":
      return { key: "making", label: "กำลังถ่ายทำ", hint: "ทีมงานกำลังดำเนินการถ่ายทำ", tone: "wait" };
    case "edit":
    case "qc":
      return revised
        ? { key: "revised", label: "ทีมกำลังแก้ตามที่แจ้ง", hint: "ได้รับบรีฟแก้ของคุณแล้ว ทีมกำลังแก้ไข เสร็จแล้วจะกลับมาให้ตรวจอีกครั้ง", tone: "wait" }
        : { key: "making", label: "กำลังตัดต่อ", hint: "ทีมงานกำลังตัดต่อ เสร็จแล้วจะส่งให้คุณตรวจ", tone: "wait" };
    case "approved":
      return { key: "approved", label: "อนุมัติแล้ว", hint: "คุณอนุมัติแล้ว รอโพส", tone: "done" };
    case "posted":
      return { key: "posted", label: "โพสแล้ว", hint: "โพสเรียบร้อย", tone: "done" };
    case "rejected":
      return { key: "rejected", label: "ไม่ใช้", hint: "คุณเลือกไม่ใช้คลิปนี้", tone: "muted" };
    default:
      return { key: "making", label: "กำลังดำเนินการ", hint: "", tone: "wait" };
  }
}

// filter chips, in the order a clip travels
export const CLIENT_FILTERS: { key: string; label: string; match: (t: { type: string; revisionCount?: number | null }) => boolean }[] = [
  { key: "all", label: "ทั้งหมด", match: () => true },
  { key: "plan", label: "Plan (รอเลือก)", match: (t) => clientState(t).key === "plan" },
  { key: "check", label: "ตรวจ (รอคุณตรวจ)", match: (t) => clientState(t).key === "check" },
  { key: "revised", label: "สั่งแก้แล้ว", match: (t) => clientState(t).key === "revised" },
  { key: "making", label: "กำลังทำ", match: (t) => clientState(t).key === "making" },
  { key: "approved", label: "ผ่านแล้ว", match: (t) => clientState(t).key === "approved" },
  { key: "posted", label: "โพสแล้ว", match: (t) => clientState(t).key === "posted" },
];

// clips that need the client first, then the rest in pipeline order
const ORDER: Record<ClientState["key"], number> = { check: 0, plan: 1, revised: 2, making: 3, approved: 4, posted: 5, rejected: 6 };
export const clientOrder = (t: { type: string; revisionCount?: number | null }) => ORDER[clientState(t).key];
