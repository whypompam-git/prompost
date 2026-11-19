// The number on the "ตรวจดราฟ" menu icon: clips waiting at QC (same list the review page shows).
// Each person picks whether it counts every clip or only their own (editor or responsible
// person). Saved per device.
export type ReviewBadgeMode = "mine" | "all";
const KEY = "prompost:review-badge";
export const REVIEW_PREF_EVENT = "pp:review-pref";

export type BadgeItem = { id: string; clientId: string; editorId: string | null; assigneeId: string | null };
export type BadgeData = { review: BadgeItem[]; deliver: BadgeItem[]; revise: BadgeItem[] };

export function readReviewMode(): ReviewBadgeMode {
  try {
    return localStorage.getItem(KEY) === "all" ? "all" : "mine";
  } catch {
    return "mine";
  }
}

export function saveReviewMode(mode: ReviewBadgeMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {}
  window.dispatchEvent(new Event(REVIEW_PREF_EVENT));
}

export const isMine = (i: Pick<BadgeItem, "editorId" | "assigneeId">, me: string) => i.editorId === me || i.assigneeId === me;

export function countReview(items: Pick<BadgeItem, "editorId" | "assigneeId">[], mode: ReviewBadgeMode, me: string): number {
  return mode === "all" ? items.length : items.filter((i) => isMine(i, me)).length;
}

// Why a client icon has a dot: per client, how many clips wait for us and for what.
export type ClientReasons = { review: number; deliver: number; revise: number };
export function clientReasons(data: BadgeData): Map<string, ClientReasons> {
  const m = new Map<string, ClientReasons>();
  const add = (list: BadgeItem[], k: keyof ClientReasons) => {
    for (const i of list) {
      const e = m.get(i.clientId) ?? { review: 0, deliver: 0, revise: 0 };
      e[k] += 1;
      m.set(i.clientId, e);
    }
  };
  add(data.review, "review");
  add(data.deliver, "deliver");
  add(data.revise, "revise");
  return m;
}

export function reasonText(r: ClientReasons): string {
  return [r.review && `รอตรวจ ${r.review}`, r.revise && `ต้องแก้ ${r.revise}`, r.deliver && `รอส่ง Drive ${r.deliver}`].filter(Boolean).join(" · ");
}
