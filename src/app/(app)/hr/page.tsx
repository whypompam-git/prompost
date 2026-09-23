"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarPlus } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { LeaveModal, type LeaveFormValues } from "@/components/hr/LeaveModal";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  createLeaveRequestRow,
  ensurePayrollEntriesForMonth,
  listLeaveRequests,
  listPayrollEntries,
  listStaff,
} from "@/lib/supabase/queries";
import type { LeaveRequest, LeaveStatus, PayrollEntry, Staff } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEAVE_TYPE_LABEL: Record<LeaveRequest["leaveType"], string> = {
  personal: "ลากิจ",
  sick: "ลาป่วย",
  vacation: "ลาพักร้อน",
};

const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
};

const LEAVE_STATUS_STYLE: Record<LeaveStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

const currency = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0 });
const currentPeriodMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString()
  .slice(0, 10);

export default function MyStaffPage() {
  const auth = useAuth();
  const [me, setMe] = useState<Staff | null>(null);
  const [myLeave, setMyLeave] = useState<LeaveRequest[]>([]);
  const [myPayroll, setMyPayroll] = useState<PayrollEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const staffRows = await listStaff();
      const self = staffRows.find((s) => s.id === auth.staffId) ?? null;
      setMe(self);

      if (self) {
        const [leaveRows] = await Promise.all([
          listLeaveRequests(),
          ensurePayrollEntriesForMonth(currentPeriodMonth, [self]),
        ]);
        setMyLeave(leaveRows.filter((l) => l.staffId === self.id));
        const payrollRows = await listPayrollEntries(currentPeriodMonth);
        setMyPayroll(payrollRows.find((p) => p.staffId === self.id) ?? null);
      }
      setLoading(false);
    }
    load();
  }, [auth.staffId]);

  async function handleSaveLeave(values: LeaveFormValues) {
    const created = await createLeaveRequestRow(values);
    setMyLeave((prev) => [created, ...prev]);
    setLeaveModalOpen(false);
  }

  if (loading) {
    return (
      <>
        <Topbar title="พนักงาน" subtitle="ข้อมูลของฉันและวันลา" />
        <LoadingView />
      </>
    );
  }

  if (!me) {
    return (
      <>
        <Topbar title="พนักงาน" subtitle="ข้อมูลของฉันและวันลา" />
        <div className="flex-1 p-6">
          <p className="text-sm text-gray-400">ไม่พบข้อมูลพนักงานของบัญชีนี้</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="พนักงาน" subtitle="ข้อมูลของฉันและวันลา" />
      <div className="flex-1 space-y-6 p-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">ข้อมูลของฉัน</h2>
          <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white ${me.avatarColor}`}
              >
                {me.name.slice(0, 1)}
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">{me.name}</p>
                <p className="text-sm text-gray-500">{me.position}</p>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 text-sm sm:pl-4">
              <div>
                <p className="text-xs text-gray-400">เบอร์โทร</p>
                <p className="text-gray-700">{me.phone || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">อีเมล</p>
                <p className="text-gray-700">{me.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">วันที่เริ่มงาน</p>
                <p className="text-gray-700">
                  {me.hireDate ? format(new Date(me.hireDate), "d MMM yyyy", { locale: th }) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">เงินเดือนพื้นฐาน</p>
                <p className="text-gray-700">฿{currency(me.baseSalary)}</p>
              </div>
            </div>
          </Card>
        </section>

        {myPayroll && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">
              เงินเดือนประจำเดือน {format(new Date(), "MMMM yyyy", { locale: th })}
            </h2>
            <Card className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-400">เงินเดือนพื้นฐาน</p>
                <p className="font-medium text-gray-800">฿{currency(myPayroll.baseSalary)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">โบนัส</p>
                <p className="font-medium text-gray-800">฿{currency(myPayroll.bonus)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">หัก</p>
                <p className="font-medium text-gray-800">฿{currency(myPayroll.deductions)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">สถานะ</p>
                <span
                  className={cn(
                    "inline-block rounded-full px-2.5 py-1 text-xs font-medium",
                    myPayroll.paidAt
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-600",
                  )}
                >
                  {myPayroll.paidAt ? "จ่ายแล้ว" : "ยังไม่จ่าย"}
                </span>
              </div>
            </Card>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">วันหยุด / การลาของฉัน</h2>
            <button
              onClick={() => setLeaveModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <CalendarPlus size={16} />
              แจ้งวันหยุด
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">ช่วงวันที่</th>
                  <th className="px-5 py-3 font-medium">ประเภท</th>
                  <th className="px-5 py-3 font-medium">หมายเหตุ</th>
                  <th className="px-5 py-3 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {myLeave.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {format(new Date(leave.dateFrom), "d MMM", { locale: th })}
                      {leave.dateFrom !== leave.dateTo &&
                        ` – ${format(new Date(leave.dateTo), "d MMM", { locale: th })}`}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{LEAVE_TYPE_LABEL[leave.leaveType]}</td>
                    <td className="px-5 py-3 text-gray-500">{leave.note || "—"}</td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-medium",
                          LEAVE_STATUS_STYLE[leave.status],
                        )}
                      >
                        {LEAVE_STATUS_LABEL[leave.status]}
                      </span>
                    </td>
                  </tr>
                ))}
                {myLeave.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-center text-sm text-gray-400">
                      ยังไม่มีรายการลา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {leaveModalOpen && (
        <LeaveModal staff={[me]} onClose={() => setLeaveModalOpen(false)} onSave={handleSaveLeave} />
      )}
    </>
  );
}
