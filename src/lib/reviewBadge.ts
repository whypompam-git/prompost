// The number on the "ตรวจดราฟ" menu icon: clips waiting at QC. Each person picks whether it
// counts every clip or only their own (editor / assignee). Saved per device.
export type ReviewBadgeMode = "mine" | "all";
const KEY = "prompost:review-badge";
export const REVIEW_PREF_EVENT = "pp:review-pref";

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

export function countReview(items: { editorId: string | null; assigneeId: string | null }[], mode: ReviewBadgeMode, me: string): number {
  return mode === "all" ? items.length : items.filter((i) => i.editorId === me || (!i.editorId && i.assigneeId === me)).length;
}
