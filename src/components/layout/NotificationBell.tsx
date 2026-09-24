"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CalendarOff, CircleAlert, MessageSquareText, Receipt } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  listClients,
  listInvoices,
  listLeaveRequests,
  listQuotations,
  listStaff,
  listTasks,
} from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";

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
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [tasks, clients, staff] = await Promise.all([listTasks(), listClients(), listStaff()]);
    const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "";
    const out: Notice[] = [];

    if (isOwner || auth.canViewAccounting) {
      const [quotations, invoices] = await Promise.all([listQuotations(), listInvoices()]);
      for (const q of quotations) {
        if (q.clientFeedback) {
          out.push({
            id: `fb:${q.id}:${q.clientFeedback.length}`,
            icon: "feedback",
            title: `${clientName(q.clientId)} ส่งข้อความเกี่ยวกับ ${q.quoteNo}`,
            detail: q.clientFeedback,
            href: "/accounting",
          });
        }
      }
      const today = new Date().toISOString().slice(0, 10);
      for (const inv of invoices) {
        if (inv.status === "unpaid" && inv.dueDate && inv.dueDate < today) {
          out.push({
            id: `inv:${inv.id}`,
            icon: "invoice",
            title: `${inv.invoiceNo} เลยกำหนดชำระ`,
            detail: clientName(inv.clientId),
            href: "/accounting",
          });
        }
      }
    }

    if (isOwner) {
      const leaves = await listLeaveRequests();
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
    }

    const soon = new Date(Date.now() + 2 * DAY).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    for (const t of tasks) {
      if (t.status === "done") continue;
      if (!isOwner && t.assigneeId !== auth.staffId) continue;
      if (t.dueDate <= soon) {
        out.push({
          id: `task:${t.id}:${t.dueDate}`,
          icon: "task",
          title: t.dueDate < today ? `เลยกำหนดส่ง: ${t.title}` : `ใกล้ถึงกำหนดส่ง: ${t.title}`,
          detail: `${clientName(t.clientId)} · ส่ง ${t.dueDate}`,
          href: `/tasks/${t.id}`,
        });
      }
    }

    setNotices(out);
  }, [auth.canViewAccounting, auth.staffId, isOwner]);

  useEffect(() => {
    setSeen(readSeen());
    load().catch(() => {});
    const timer = setInterval(() => load().catch(() => {}), 60_000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const unseen = notices.filter((n) => !seen.has(n.id)).length;

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
        <div className="pp-pop-menu absolute right-0 top-11 z-40 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-800">
            การแจ้งเตือน
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notices.map((n) => {
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
            {notices.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-400">ไม่มีการแจ้งเตือน</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
