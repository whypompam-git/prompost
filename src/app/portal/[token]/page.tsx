import { notFound } from "next/navigation";
import { FileText, Film, Receipt as ReceiptIcon, ScrollText } from "lucide-react";
import { APP_NAME } from "@/config/branding";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { calcQuotationTotals } from "@/lib/accounting";
import { createClient } from "@/lib/supabase/server";
import type { QuotationItem, QuotationStatus, TaskStatus, TaskType } from "@/lib/types";

const TYPE_LABEL: Record<TaskType, string> = {
  shoot: "ถ่ายทำ",
  edit: "ตัดต่อ",
  review: "ตรวจสอบ",
  deliver: "ส่งมอบ",
  other: "อื่นๆ",
};

const QUOTE_STATUS_LABEL: Record<QuotationStatus, string> = {
  draft: "ร่าง",
  sent: "ส่งแล้ว",
  accepted: "ยอมรับแล้ว",
  rejected: "ปฏิเสธ",
};

const currency = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0 });
const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

// Public client portal — reached via an unguessable token, no login required.
// Currently reads through the anon key with open RLS (no policies yet — see
// the migration's own note). Fine for now with no auth in the app at all;
// once staff accounts exist, this should move behind a service-role backend
// call keyed on portal_token, the same pattern hops's own customer-booking
// link uses, so a client can never see another client's RLS-gated rows.
export default async function ClientPortalPage({ params }: { params: { token: string } }) {
  const supabase = createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, name")
    .eq("portal_token", params.token)
    .maybeSingle();

  if (!client) notFound();

  const [{ data: tasks }, { data: quotations }, { data: receipts }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, type, status, script_url, footage_url")
      .eq("client_id", client.id)
      .order("scheduled_date", { ascending: false }),
    supabase
      .from("quotations")
      .select("id, quote_no, items, vat_percent, wht_percent, status, created_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("receipts")
      .select("id, receipt_no, amount, created_at")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }),
  ]);

  const taskList = (tasks ?? []) as {
    id: string;
    title: string;
    type: TaskType;
    status: TaskStatus;
    script_url: string | null;
    footage_url: string | null;
  }[];

  const total = taskList.length;
  const done = taskList.filter((t) => t.status === "done").length;
  const inProgress = taskList.filter((t) => t.status === "in_progress" || t.status === "review").length;
  const todo = taskList.filter((t) => t.status === "todo").length;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600">{APP_NAME}</p>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">แดชบอร์ดของ {client.name}</h1>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="คลิปทั้งหมด" value={total} tone="gray" />
          <StatTile label="เสร็จแล้ว" value={done} tone="emerald" />
          <StatTile label="กำลังทำ" value={inProgress} tone="sky" />
          <StatTile label="ยังไม่ทำ" value={todo} tone="amber" />
        </div>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <Film size={15} />
            รายการงาน/คลิป
          </h2>
          <Card className="space-y-2">
            {taskList.map((task) => (
              <div key={task.id} className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{task.title}</p>
                    <p className="text-xs text-gray-400">{TYPE_LABEL[task.type]}</p>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
                {(task.script_url || task.footage_url) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {task.script_url && (
                      <a
                        href={task.script_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        <ScrollText size={13} />
                        ดูสคริปต์
                      </a>
                    )}
                    {task.footage_url && (
                      <a
                        href={task.footage_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        <Film size={13} />
                        ดู Footage
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
            {taskList.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">ยังไม่มีงานสำหรับลูกค้ารายนี้</p>
            )}
          </Card>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <FileText size={15} />
            ใบเสนอราคา
          </h2>
          <Card className="space-y-2">
            {(quotations ?? []).map((q) => {
              const totals = calcQuotationTotals(
                q.items as QuotationItem[],
                q.vat_percent,
                q.wht_percent,
              );
              return (
                <div key={q.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{q.quote_no}</p>
                    <p className="text-xs text-gray-400">{dateLabel(q.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">฿{currency(totals.total)}</p>
                    <p className="text-xs text-gray-400">{QUOTE_STATUS_LABEL[q.status as QuotationStatus]}</p>
                  </div>
                </div>
              );
            })}
            {(!quotations || quotations.length === 0) && (
              <p className="py-6 text-center text-sm text-gray-400">ยังไม่มีใบเสนอราคา</p>
            )}
          </Card>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <ReceiptIcon size={15} />
            ใบเสร็จรับเงิน
          </h2>
          <Card className="space-y-2">
            {(receipts ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.receipt_no}</p>
                  <p className="text-xs text-gray-400">{dateLabel(r.created_at)}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">฿{currency(r.amount)}</p>
              </div>
            ))}
            {(!receipts || receipts.length === 0) && (
              <p className="py-6 text-center text-sm text-gray-400">ยังไม่มีใบเสร็จ</p>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "gray" | "emerald" | "sky" | "amber";
}) {
  const toneStyle: Record<string, string> = {
    gray: "bg-white text-gray-900",
    emerald: "bg-emerald-50 text-emerald-700",
    sky: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className={`rounded-2xl border border-gray-100 p-4 text-center shadow-card ${toneStyle[tone]}`}>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}
