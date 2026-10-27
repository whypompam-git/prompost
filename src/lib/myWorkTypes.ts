// Types and pure helpers for the "งานของฉัน" screen and its /api/my/* endpoints.
// stages a clip passes through while it is the editor's job, in display order
export const MY_STAGES = ["edit", "qc", "pending", "approved", "posted"] as const;

export type MyTask = {
  id: string;
  title: string;
  type: string;
  status: string;
  clientName: string;
  editDate: string | null; // the day the editor works on it AND hands it in — the only deadline they see
  scriptText: string | null;
  shots: string[];
  equipment: string[];
  notes: string | null;
  footageUrl: string | null;
  refLink: string | null;
  finalUrl: string | null;
  revisionCount: number;
  revisionBrief: string | null;
};

export type MyBucket = "revise" | "todo" | "review" | "done";

// ต้องแก้ = sent back with a brief; ต้องทำ = still editing; ส่งตรวจแล้ว = in QC / with the client; เสร็จแล้ว = approved or posted
export function bucketOf(t: Pick<MyTask, "type" | "revisionCount">): MyBucket {
  if (t.type === "edit") return t.revisionCount > 0 ? "revise" : "todo";
  if (t.type === "qc" || t.type === "pending") return "review";
  return "done";
}
