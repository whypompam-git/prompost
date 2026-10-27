"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CalendarOff, CircleAlert, MessageSquareText, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { bangkokDay, buildDigest } from "@/lib/alerts";
import { alertBilling } from "@/lib/billing";
import {
  listClientPackages,
  listClients,
  listNotifications,
  markNotificationsRead,
  type AppNotification,
  listInvoices,
  listLeaveRequests,
  listPackages,
  listQuotations,
  listReceipts,
  listStaff,
  listDueTasks,
  listTransactions,
} from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";

const ACTION_KINDS = new Set(["client_revise", "qc_revise", "assigned", "overdue"]);
const timeAgo = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีก่อน`;
  if (m < 1440) return `${Math.round(m / 60)} ชม.ก่อน`;
  return `${Math.round(m / 1440)} วันก่อน`;
};

// the automatic alerts are shared across pages: switching pages must not refetch them
let alertsCache: { at: number; who: string; notices: Notice[] } | null = null;
const ALERTS_TTL_MS = 300_000;

const SEEN_KEY = "prompost:seen-notifications";
const DAY = 86_400_000;

type Notice = {
  id: string;
  icon: "feedback" | "task" | "leave" | "invoice";
  title: string;
  detail: string;
  href: string;
};

const ICONS = {
  feedback: MessageSquareText,
  task: CircleAlert,
  leave: CalendarOff,
  invoice: Receipt,
};

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

export function NotificationBell() {
  const auth = useAuth();
  const isOwner = auth.role === "owner";
  const [notices, setNotices] = useState<Notice[]>([]);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [inbox, setInbox] = useState<AppNotification[]>([]);
  const [tab, setTab] = useState<"all" | "todo">("all");
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const wantsMoney = isOwner || auth.permissions.documents || auth.permissions.accounting;
    const soon = new Date(Date.now() + 2 * DAY).toISOString().slice(0, 10);
    // everything in ONE round of parallel requests (it used to be four in a row)
    const [clients, staff, due, quotations, invoices, rounds, packages, receipts, txs, leaves] = await Promise.all([
      listClients(),
      isOwner ? listStaff() : Promise.resolve([] as Awaited<ReturnType<typeof listStaff>>),
      listDueTasks(soon),
      wantsMoney ? listQuotations() : Promise.resolve([]),
      wantsMoney ? listInvoices() : Promise.resolve([]),
      wantsMoney ? listClientPackages() : Promise.resolve([]),
      wantsMoney ? listPackages() : Promise.resolve([]),
      wantsMoney ? listReceipts() : Promise.resolve([]),
      wantsMoney ? listTransactions().catch(() => []) : Promise.resolve([]),
      isOwner ? listLeaveRequests() : Promise.resolve([]),
    ]);
    const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "";
    const out: Notice[] = [];

    if (wantsMoney) {
      for (const q of quotations) {
        if (q.clientFeedback) {
          out.push({
            id: `fb:${q.id}:${q.clientFeedback.length}`,
            icon: "feedback",
            title: `${clientName(q.clientId)} ส่งข้อความเกี่ยวกับ ${q.quoteNo}`,
            detail: q.clientFeedback,
            href: "/documents",
          });
        }
      }
      const billing = alertBilling(
        rounds.map((r) => ({ id: r.id, clientId: r.clientId, packageName: packages.find((p) => p.id === r.packageId)?.name ?? "", amount: r.amount, assignedAt: r.assignedAt })),
        quotations.map((q) => ({ id: q.id, clientId: q.clientId, clientPackageId: q.clientPackageId, status: q.status, createdAt: q.createdAt, items: q.items, vatPercent: q.vatPercent, whtPercent: q.whtPercent })),
        receipts.map((r) => ({ id: r.id, clientId: r.clientId, clientPackageId: r.clientPackageId, amount: r.amount, createdAt: r.createdAt })),
        txs,
      );
      const owed = buildDigest({
        today: bangkokDay(new Date()),
        graceDays: 7,
        clients: clients.map((c) => ({ id: c.id, name: c.name })),
        staff: [],
        tasks: [],
        invoices: [],
        rounds: billing.rounds,
        receipts: billing.receipts,
        leave: [],
      }).overduePayments;
      for (const p of owed) {
        out.push({
          id: `pay:${p.client}:${p.label}:${p.amount}`,
          icon: "invoice",
          title: `${p.client} ค้างชำระ ฿${p.amount.toLocaleString("th-TH")}`,
          detail: `${p.label} · เกิน ${p.days} วัน`,
          href: "/clients",
        });
      }
      const today = new Date().toISOString().slice(0, 10);
      for (const inv of invoices) {
        if (inv.status === "unpaid" && inv.dueDate && inv.dueDate < today) {
          out.push({
            id: `inv:${inv.id}`,
            icon: "invoice",
            title: `${inv.invoiceNo} เลยกำหนดชำระ`,
            detail: clientName(inv.clientId),
            href: "/documents",
          });
        }
      }
    }

    for (const l of leaves) {
      if (l.status === "pending") {
        const name = staff.find((s) => s.id === l.staffId)?.name ?? "พนักงาน";
        out.push({
          id: `leave:${l.id}`,
          icon: "leave",
          title: `${name} ขอลา รออนุมัติ`,
          detail: `${l.dateFrom}${l.dateTo !== l.dateFrom ? ` – ${l.dateTo}` : ""}`,
          href: "/settings/staff",
        });
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    for (const t of due) {
      if (!isOwner && t.assigneeId !== auth.staffId) continue;
      out.push({
        id: `task:${t.id}:${t.dueDate}`,
        icon: "task",
        title: t.dueDate < today ? `เลยกำหนดส่ง: ${t.title}` : `ใกล้ถึงกำหนดส่ง: ${t.title}`,
        detail: `${clientName(t.clientId)} · ส่ง ${t.dueDate}`,
        href: `/tasks/${t.id}`,
      });
    }

    alertsCache = { at: Date.now(), who: auth.staffId, notices: out };
    setNotices(out);
  }, [auth.permissions.documents, auth.permissions.accounting, auth.staffId, isOwner]);

  const loadInbox = useCallback(async () => {
    setInbox(await listNotifications(50));
  }, []);

  // the personal inbox is cheap (one small query) so it refreshes faster
  useEffect(() => {
    loadInbox().catch(() => {});
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") loadInbox().catch(() => {});
    }, 45_000);
    return () => clearInterval(timer);
  }, [loadInbox]);

  async function openInboxItem(n: AppNotification) {
    setOpen(false);
    if (!n.readAt) {
      setInbox((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      markNotificationsRead([n.id]).catch(() => {});
    }
    router.push(n.taskId ? `/tasks/${n.taskId}` : n.clientId ? `/clients/${n.clientId}` : "/dashboard");
  }

  async function readAll() {
    setInbox((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    markNotificationsRead("all").catch(() => {});
  }

  useEffect(() => {
    setSeen(readSeen());
    // reuse what an earlier page already computed; otherwise fetch a moment AFTER the
    // page has drawn so the alerts never slow down opening a page
    const fresh = alertsCache && alertsCache.who === auth.staffId && Date.now() - alertsCache.at < ALERTS_TTL_MS;
    if (fresh) setNotices(alertsCache!.notices);
    const first = fresh ? undefined : setTimeout(() => load().catch(() => {}), 2500);
    const timer = setInterval(() => load().catch(() => {}), ALERTS_TTL_MS);
    return () => {
      if (first) clearTimeout(first);
      clearInterval(timer);
    };
  }, [load, auth.staffId]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const unreadInbox = inbox.filter((n) => !n.readAt).length;
  const unseen = notices.filter((n) => !seen.has(n.id)).length + unreadInbox;
  const shownInbox = tab === "todo" ? inbox.filter((n) => ACTION_KINDS.has(n.kind)) : inbox;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const all = new Set([...seen, ...notices.map((n) => n.id)]);
      // keep badge visible for this open, clear it once the panel closes
      setTimeout(() => {
        try {
          localStorage.setItem(SEEN_KEY, JSON.stringify([...all]));
        } catch {}
        setSeen(all);
      }, 1500);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={toggle}
        className="relative rounded-full p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        aria-label="การแจ้งเตือน"
      >
        <Bell size={18} />
        {unseen > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unseen > 9 ? "9+" : unseen}
          </span>
        )}
      </button>

      {open && (
        <div className="pp-pop-menu fixed inset-x-3 top-16 z-40 overflow-hidden sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-80 rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-gray-800">การแจ้งเตือน</span>
            {unreadInbox > 0 && (
              <button onClick={readAll} className="text-xs font-medium text-brand-600 hover:underline">
                อ่านทั้งหมด
              </button>
            )}
          </div>
          <div className="flex gap-1 border-b border-gray-100 px-3 py-2 text-xs font-medium">
            {([["all", "ทั้งหมด"], ["todo", "ต้องทำ"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn("rounded-full px-3 py-1", tab === key ? "bg-brand-500 text-white" : "text-gray-500 hover:bg-gray-50")}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="max-h-[70vh] overflow-y-auto sm:max-h-96">
            {shownInbox.map((n) => (
              <button
                key={n.id}
                onClick={() => openInboxItem(n)}
                className={cn(
                  "flex w-full gap-3 border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50",
                  !n.readAt && "bg-brand-50/50",
                )}
              >
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-brand-500")} />
                <div className="min-w-0">
                  <p className={cn("text-sm text-gray-800", !n.readAt && "font-medium", (n.kind === "client_revise" || n.kind === "qc_revise") && "text-rose-700")}>
                    {n.title}
                    {n.count > 1 && <span className="ml-1.5 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">×{n.count}</span>}
                  </p>
                  {n.body && <p className="line-clamp-2 text-xs text-gray-500">{n.body}</p>}
                  <p className="mt-0.5 text-[11px] text-gray-400">{timeAgo(n.createdAt)}</p>
                </div>
              </button>
            ))}
            {tab === "todo" ? null : notices.length > 0 && shownInbox.length > 0 && (
              <p className="bg-gray-50 px-4 py-1.5 text-[11px] font-medium text-gray-400">เตือนอัตโนมัติ</p>
            )}
            {(tab === "todo" ? [] : notices).map((n) => {
              const Icon = ICONS[n.icon];
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex gap-3 border-b border-gray-50 px-4 py-3 hover:bg-gray-50",
                    !seen.has(n.id) && "bg-brand-50/50",
                  )}
                >
                  <Icon size={16} className="mt-0.5 shrink-0 text-brand-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{n.title}</p>
                    <p className="line-clamp-2 text-xs text-gray-500">{n.detail}</p>
                  </div>
                </Link>
              );
            })}
            {shownInbox.length === 0 && (tab === "todo" || notices.length === 0) && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">ไม่มีการแจ้งเตือน</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
