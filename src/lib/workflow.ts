// The content-production pipeline. tasks.type is the stage, tasks.status is
// the sub-status inside that stage. All automatic moves live here so the
// staff UI, the client link and the notification code agree.
import type { TaskStatus } from "./types.ts";

export type Stage = "plan" | "shoot" | "edit" | "qc" | "pending" | "approved" | "posted" | "rejected" | "other";

export const STAGES: {
  key: Stage;
  label: string;
  color: string;
  statuses: TaskStatus[]; // first = default when entering the stage
}[] = [
  { key: "plan", label: "Plan", color: "violet", statuses: ["waiting"] },
  { key: "shoot", label: "ถ่ายทำ", color: "sky", statuses: ["todo", "done"] },
  { key: "edit", label: "ตัดต่อ", color: "orange", statuses: ["todo", "done"] },
  { key: "qc", label: "QC", color: "amber", statuses: ["review", "done"] },
  { key: "pending", label: "Pending", color: "rose", statuses: ["waiting"] },
  { key: "approved", label: "ผ่าน", color: "emerald", statuses: ["done"] },
  { key: "posted", label: "Post", color: "teal", statuses: ["done"] },
  { key: "rejected", label: "ไม่ใช้", color: "gray", statuses: ["done"] },
  { key: "other", label: "อื่นๆ", color: "gray", statuses: ["todo", "in_progress", "done"] },
];

export const isStage = (v: string): v is Stage => STAGES.some((s) => s.key === v);
export const stageInfo = (key: string) => STAGES.find((s) => s.key === key);

// Status wording depends on the stage it sits in.
export function statusLabel(stage: string, status: TaskStatus): string {
  if (stage === "plan" && status === "waiting") return "รอลูกค้าเลือก";
  if (stage === "pending" && status === "waiting") return "รอลูกค้าอนุมัติ";
  if (stage === "shoot" && status === "done") return "ถ่ายเสร็จ (รออัปโหลดไฟล์)";
  if (stage === "qc" && status === "review") return "In Review";
  if (stage === "approved") return "รอโพส";
  if (stage === "posted") return "โพสแล้ว";
  if (stage === "rejected") return "ไม่ใช้";
  return (
    { todo: "ToDo", in_progress: "กำลังทำ", review: "ตรวจสอบ", done: "Done", waiting: "รอ" } as Record<TaskStatus, string>
  )[status];
}

export const statusesFor = (stage: string): TaskStatus[] => stageInfo(stage)?.statuses ?? ["todo", "in_progress", "done"];
export const defaultStatusFor = (stage: string): TaskStatus => statusesFor(stage)[0];

export type FlowTask = {
  type: string;
  status: TaskStatus;
  footageUrl?: string | null;
  revisionCount?: number;
};

export type FlowResult = { type: string; status: TaskStatus; revisionCount: number; moved: boolean };

// Chains the automatic hand-offs after any change a person makes:
//   shoot Done + file uploaded -> edit ToDo;  edit Done -> QC In Review;
//   QC Done -> Pending (waiting for the client).
export function settle(task: FlowTask): FlowResult {
  let { type, status } = task;
  const revisionCount = task.revisionCount ?? 0;
  const startType = type;
  const startStatus = status;
  if (!statusesFor(type).includes(status)) status = defaultStatusFor(type);
  for (let i = 0; i < 4; i++) {
    if (type === "shoot" && status === "done" && task.footageUrl?.trim()) {
      type = "edit";
      status = "todo";
    } else if (type === "edit" && status === "done") {
      type = "qc";
      status = "review";
    } else if (type === "qc" && status === "done") {
      type = "pending";
      status = "waiting";
    } else break;
  }
  return { type, status, revisionCount, moved: type !== startType || status !== startStatus };
}

// Picking a stage by hand starts it at its default sub-status.
export function enterStage(stage: string, task: Pick<FlowTask, "footageUrl" | "revisionCount">): FlowResult {
  return settle({ ...task, type: stage, status: defaultStatusFor(stage) });
}

export type ClientAction = "use" | "revise" | "reject" | "pass";

export type ClientActionResult =
  | { ok: true; type: string; status: TaskStatus; revisionCount: number; needsBrief: boolean }
  | { ok: false; reason: string };

// What a click on the client link does. "แก้" always needs a brief and bumps
// the revision counter; a plan revision stays in Plan, a pending one goes
// back to the editors.
export function applyClientAction(
  task: FlowTask,
  action: ClientAction,
  brief: string | undefined,
): ClientActionResult {
  const count = task.revisionCount ?? 0;
  const waiting = task.status === "waiting";
  if (task.type === "plan" && waiting) {
    if (action === "use") return { ok: true, type: "shoot", status: "todo", revisionCount: count, needsBrief: false };
    if (action === "reject") return { ok: true, type: "rejected", status: "done", revisionCount: count, needsBrief: false };
    if (action === "revise") {
      if (!brief?.trim()) return { ok: false, reason: "brief required" };
      return { ok: true, type: "plan", status: "waiting", revisionCount: count + 1, needsBrief: true };
    }
  }
  if (task.type === "pending" && waiting) {
    if (action === "pass") return { ok: true, type: "approved", status: "done", revisionCount: count, needsBrief: false };
    if (action === "revise") {
      if (!brief?.trim()) return { ok: false, reason: "brief required" };
      return { ok: true, type: "edit", status: "todo", revisionCount: count + 1, needsBrief: true };
    }
  }
  return { ok: false, reason: "this task is not waiting for that choice" };
}

// QC sends a clip back to the editor with a brief.
export function applyQcRevision(task: FlowTask, brief: string | undefined): ClientActionResult {
  if (task.type !== "qc") return { ok: false, reason: "not in QC" };
  if (!brief?.trim()) return { ok: false, reason: "brief required" };
  return { ok: true, type: "edit", status: "todo", revisionCount: (task.revisionCount ?? 0) + 1, needsBrief: true };
}

// Old stage/status pair (pre-0032) -> the new pipeline. Mirrors the SQL in
// migration 0032 so the mapping is testable.
export function legacyToStage(type: string, status: string, footageUrl?: string | null): { type: string; status: TaskStatus } {
  if (type === "deliver") return { type: "posted", status: "done" };
  if (type === "edit") return status === "done" ? { type: "qc", status: "review" } : { type: "edit", status: "todo" };
  if (type === "review") return status === "done" ? { type: "pending", status: "waiting" } : { type: "qc", status: "review" };
  if (type === "shoot") {
    if (status === "review") return { type: "edit", status: "todo" };
    if (status === "done") return footageUrl?.trim() ? { type: "edit", status: "todo" } : { type: "shoot", status: "done" };
    return { type: "shoot", status: "todo" };
  }
  return { type, status: status as TaskStatus };
}

// "How many clips are where" — used by the client page and the client's own
// link. QC counts under ตัดต่อ; rejected and misc ("other") tasks aren't clips.
export const SUMMARY_GROUPS: { key: string; label: string; stages: Stage[] }[] = [
  { key: "plan", label: "Plan", stages: ["plan"] },
  { key: "shoot", label: "ถ่าย", stages: ["shoot"] },
  { key: "edit", label: "ตัดต่อ", stages: ["edit", "qc"] },
  { key: "pending", label: "Pending", stages: ["pending"] },
  { key: "approved", label: "ผ่าน", stages: ["approved"] },
  { key: "posted", label: "Post", stages: ["posted"] },
];

export function summarizeStages(tasks: { type: string }[]): { total: number; groups: { key: string; label: string; count: number }[] } {
  const groups = SUMMARY_GROUPS.map((g) => ({
    key: g.key,
    label: g.label,
    count: tasks.filter((t) => (g.stages as string[]).includes(t.type)).length,
  }));
  return { total: groups.reduce((n, g) => n + g.count, 0), groups };
}
