"use client";

import { useState } from "react";
import { Camera, ChevronDown, Download, ExternalLink, ListChecks, Pencil, ScrollText } from "lucide-react";
import { ScriptEditor } from "@/components/ui/ScriptEditor";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScriptText } from "@/components/ui/ScriptText";
import type { TaskStatus, TaskType } from "@/lib/types";
import { stageInfo } from "@/lib/workflow";
import { cn } from "@/lib/utils";


export function PortalTaskCard({
  taskId,
  clientKey,
  title,
  type,
  status,
  scriptText,
  refUrl,
  footageUrl,
  finalUrl,
  coverUrl,
  equipment,
  shots,
  revisionCount,
  revisionBrief,
}: {
  taskId: string;
  clientKey: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  scriptText: string | null;
  refUrl: string | null;
  footageUrl: string | null;
  finalUrl: string | null;
  coverUrl: string | null;
  equipment: string[];
  shots: string[];
  revisionCount: number;
  revisionBrief: string | null;
}) {
  const [stage, setStage] = useState<string>(type);
  const [stageStatus, setStageStatus] = useState<TaskStatus>(status);
  const [rounds, setRounds] = useState(revisionCount);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [briefDraft, setBriefDraft] = useState("");
  const [acting, setActing] = useState(false);
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);
  const [script, setScript] = useState(scriptText ?? "");
  const [editingScript, setEditingScript] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const hasScript = Boolean(script.trim());

  async function saveScript() {
    setSaving(true);
    try {
      const res = await fetch("/api/portal/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientKey, taskId, scriptText: draft }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setScript(draft);
      setEditingScript(false);
    } catch {
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  async function choose(action: "use" | "revise" | "reject" | "pass") {
    if (action === "revise" && !briefDraft.trim()) return;
    if (action === "reject" && !window.confirm("ยืนยัน: ไม่ใช้คลิปนี้?")) return;
    if (action === "pass" && !window.confirm("ยืนยัน: ผ่าน/อนุมัติคลิปนี้? (ยืนยันแล้วย้อนกลับไม่ได้)")) return;
    setActing(true);
    try {
      const res = await fetch("/api/portal/task-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientKey, taskId, action, brief: action === "revise" ? briefDraft.trim() : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert(res.status === 409 ? "สถานะงานเปลี่ยนไปแล้ว กรุณารีเฟรชหน้านี้" : "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง");
        return;
      }
      setStage(data.type);
      setStageStatus(data.status);
      setRounds(data.revisionCount);
      setReviseOpen(false);
      setBriefDraft("");
      setNotice(
        action === "revise"
          ? "ส่งบรีฟแก้เรียบร้อย — กรุณาแคปหน้าจอส่งให้ทีมงานทางไลน์ด้วย"
          : action === "pass"
            ? "อนุมัติเรียบร้อย ขอบคุณค่ะ"
            : action === "use"
              ? "รับทราบ — ทีมงานจะนัดถ่ายทำต่อไป"
              : "รับทราบ ไม่ใช้คลิปนี้",
      );
    } catch {
      window.alert("ส่งไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setActing(false);
    }
  }

  const waitingChoice = stageStatus === "waiting" && (stage === "plan" || stage === "pending");
  const expandable = true;
  const links = [
    { label: "Ref", url: refUrl },
    { label: "File", url: footageUrl },
    { label: "Final", url: finalUrl },
  ].filter((l) => l.url);

  return (
    <div className="rounded-xl bg-gray-50">
      <button
        type="button"
        onClick={() => expandable && setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 px-4 py-3 text-left",
          expandable && "cursor-pointer",
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-800">{title}</p>
          <p className="text-xs text-gray-400">
            {stageInfo(stage)?.label ?? stage}
            {rounds > 0 && ` · แก้รอบที่ ${rounds}`}
          </p>
          {equipment.length > 0 && (
            <p className="mt-1 flex items-start gap-1 text-xs text-gray-500">
              <Camera size={12} className="mt-0.5 shrink-0" />
              <span>เตรียม: {equipment.join(", ")}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={stageStatus} stage={stage} />
          {expandable && (
            <ChevronDown size={15} className={cn("text-gray-400 transition", open && "rotate-180")} />
          )}
        </div>
      </button>

      {(waitingChoice || notice) && (
        <div className="space-y-2 px-4 pb-3">
          {notice && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{notice}</p>}
          {waitingChoice && (
            <>
              {revisionBrief && rounds > 0 && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">บรีฟแก้ล่าสุดของคุณ: {revisionBrief}</p>
              )}
              <p className="text-xs font-medium text-gray-600">
                {stage === "plan" ? "แผนคลิปนี้ ใช้เลยไหม?" : "คลิปนี้ตัดต่อเสร็จแล้ว ตรวจสอบแล้วเป็นอย่างไร?"}
              </p>
              <div className="flex flex-wrap gap-2">
                {stage === "plan" ? (
                  <>
                    <button type="button" disabled={acting} onClick={() => choose("use")} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50">
                      ใช้
                    </button>
                    <button type="button" disabled={acting} onClick={() => setReviseOpen((v) => !v)} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50">
                      แก้
                    </button>
                    <button type="button" disabled={acting} onClick={() => choose("reject")} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50">
                      ไม่ใช้
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" disabled={acting} onClick={() => choose("pass")} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50">
                      ผ่าน
                    </button>
                    <button type="button" disabled={acting} onClick={() => setReviseOpen((v) => !v)} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50">
                      แก้ไข
                    </button>
                  </>
                )}
              </div>
              {reviseOpen && (
                <div className="space-y-2">
                  <textarea
                    value={briefDraft}
                    onChange={(e) => setBriefDraft(e.target.value)}
                    rows={3}
                    placeholder="พิมพ์สิ่งที่ต้องการให้แก้ เช่น 0:12 ตัดช่วงนี้ออก"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                  <p className="text-xs text-amber-700">หลังกดส่ง กรุณาแคปหน้าจอนี้ส่งให้ทีมงานทางไลน์ด้วยนะคะ</p>
                  <button type="button" disabled={acting || !briefDraft.trim()} onClick={() => choose("revise")} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-40">
                    {acting ? "กำลังส่ง..." : "ส่งบรีฟแก้"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {(links.length > 0 || coverUrl) && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3">
          {links.map((l) => (
            <span key={l.label} className="contents">
              <a
                href={l.url!.startsWith("http") ? l.url! : `https://${l.url}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
              >
                <ExternalLink size={11} />
                {l.label}
              </a>
              {l.label === "Final" && coverUrl && <CoverDownload url={coverUrl} title={title} />}
            </span>
          ))}
          {!finalUrl && coverUrl && <CoverDownload url={coverUrl} title={title} />}
        </div>
      )}

      {open && expandable && (
        <div className="space-y-3 border-t border-gray-100 px-4 py-3">
          {shots.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                <ListChecks size={12} />
                Shot list
              </p>
              <ul className="list-inside list-decimal space-y-0.5 rounded-lg bg-white p-3 text-sm text-gray-700">
                {shots.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="flex items-center gap-1 text-xs font-medium text-gray-500">
                <ScrollText size={12} />
                สคริปต์
              </p>
              {!editingScript && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(script);
                    setEditingScript(true);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  <Pencil size={11} />
                  แก้ไขสคริปต์
                </button>
              )}
            </div>
            {editingScript ? (
              <div className="space-y-2">
                <ScriptEditor value={draft} onChange={setDraft} />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingScript(false)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={saveScript}
                    disabled={saving}
                    className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {saving ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </div>
            ) : hasScript ? (
              <ScriptText text={script} className="rounded-lg bg-white p-3 text-sm text-gray-700" />
            ) : (
              <p className="rounded-lg bg-white p-3 text-sm text-gray-400">ยังไม่มีสคริปต์</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Sits right beside the Final button so the client grabs video + cover in
// one go. Fetching as a blob forces a real download — the bare `download`
// attribute is ignored for cross-origin (storage) URLs.
function CoverDownload({ url, title }: { url: string; title: string }) {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    setBusy(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "jpg").split("+")[0];
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${title}-ปก.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank", "noreferrer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={busy}
      className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 py-0.5 pl-0.5 pr-2.5 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-60"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-6 w-6 rounded-md object-cover" />
      <Download size={11} />
      {busy ? "กำลังโหลด..." : "ปก"}
    </button>
  );
}
