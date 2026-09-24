"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  CheckCircle2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { LoadingView } from "@/components/ui/LoadingView";
import { StaffModal, type StaffFormValues } from "@/components/hr/StaffModal";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  createStaffRow,
  deleteStaffRow,
  ensurePayrollEntriesForMonth,
  listInactiveStaff,
  listLeaveRequests,
  listPayrollEntries,
  listStaff,
  permanentlyDeleteStaffRow,
  reactivateStaffRow,
  togglePayrollPaid,
  updateLeaveStatus,
  updatePayrollEntry,
  updateStaffRow,
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

export default function StaffSettingsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [inactiveStaff, setInactiveStaff] = useState<Staff[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [payroll, setPayroll] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [staffModalMode, setStaffModalMode] = useState<"closed" | "create" | { edit: Staff }>(
    "closed",
  );

  useEffect(() => {
    if (auth.role !== "owner") {
      router.replace("/dashboard");
      return;
    }
    async function load() {
      const [staffRows, inactiveRows, leaveRows] = await Promise.all([
        listStaff(),
        listInactiveStaff(),
        listLeaveRequests(),
      ]);
      await ensurePayrollEntriesForMonth(currentPeriodMonth, staffRows);
      const payrollRows = await listPayrollEntries(currentPeriodMonth);
      const activeIds = new Set(staffRows.map((s) => s.id));
      setStaff(staffRows);
      setInactiveStaff(inactiveRows);
      setLeaveRequests(leaveRows.filter((l) => activeIds.has(l.staffId)));
      setPayroll(payrollRows.filter((p) => activeIds.has(p.staffId)));
      setLoading(false);
    }
    load();
  }, [auth.role, router]);

  const staffName = (id: string) => staff.find((s) => s.id === id)?.name ?? "—";

  async function handleSaveStaff(values: StaffFormValues, avatarColor: string, pin?: string) {
    if (staffModalMode === "create") {
      const created = await createStaffRow({ ...values, avatarColor }, pin);
      setStaff((prev) => [...prev, created]);
      await ensurePayrollEntriesForMonth(currentPeriodMonth, [created]);
      const payrollRows = await listPayrollEntries(currentPeriodMonth);
      setPayroll(payrollRows);
    } else if (staffModalMode !== "closed") {
      const { edit } = staffModalMode;
      await updateStaffRow(edit.id, { ...values, avatarColor }, pin);
      setStaff((prev) => prev.map((s) => (s.id === edit.id ? { ...s, ...values, avatarColor } : s)));
    }
    setStaffModalMode("closed");
  }

  async function handleDeleteStaff(s: Staff) {
    if (!window.confirm(`ลบพนักงาน "${s.name}" ใช่ไหม?`)) return;
    setStaff((prev) => prev.filter((x) => x.id !== s.id));
    setInactiveStaff((prev) => [...prev, s]);
    try {
      await deleteStaffRow(s.id);
    } catch (err) {
      console.error(err);
      setStaff((prev) => [...prev, s]);
      setInactiveStaff((prev) => prev.filter((x) => x.id !== s.id));
      window.alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  async function handleReactivate(s: Staff) {
    setInactiveStaff((prev) => prev.filter((x) => x.id !== s.id));
    try {
      await reactivateStaffRow(s.id);
      setStaff((prev) => [...prev, s]);
    } catch (err) {
      console.error(err);
      setInactiveStaff((prev) => [...prev, s]);
      window.alert("กู้คืนไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  async function handlePermanentDelete(s: Staff) {
    if (
      !window.confirm(
        `ลบ "${s.name}" ถาวร? ประวัติวันลาและเงินเดือนของคนนี้จะถูกลบไปด้วย และงานที่เคยมอบหมายให้จะกลายเป็น "ยังไม่มอบหมาย" — กู้คืนไม่ได้`,
      )
    )
      return;
    setInactiveStaff((prev) => prev.filter((x) => x.id !== s.id));
    try {
      await permanentlyDeleteStaffRow(s.id);
    } catch (err) {
      console.error(err);
      setInactiveStaff((prev) => [...prev, s]);
      window.alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  function setLeaveStatus(id: string, status: LeaveStatus) {
    setLeaveRequests((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    updateLeaveStatus(id, status).catch(console.error);
  }

  function updatePayroll(id: string, patch: Partial<Pick<PayrollEntry, "bonus" | "deductions">>) {
    setPayroll((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    updatePayrollEntry(id, patch).catch(console.error);
  }

  function togglePaid(id: string) {
    const entry = payroll.find((p) => p.id === id);
    const nowPaid = !entry?.paidAt;
    setPayroll((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, paidAt: nowPaid ? new Date().toISOString().slice(0, 10) : null } : p,
      ),
    );
    togglePayrollPaid(id, nowPaid).catch(console.error);
  }

  if (auth.role !== "owner") return null;

  if (loading) {
    return (
      <>
        <Topbar title="ตั้งค่า" subtitle="รายชื่อ เงินเดือน สิทธิ์การเข้าถึง และวันลา" />
      <SettingsTabs />
        <LoadingView />
      </>
    );
  }

  return (
    <>
      <Topbar title="ตั้งค่า" subtitle="รายชื่อ เงินเดือน สิทธิ์การเข้าถึง และวันลา" />
      <SettingsTabs />
      <div className="flex-1 space-y-6 p-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">รายชื่อพนักงาน</h2>
            <button
              onClick={() => setStaffModalMode("create")}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              <Plus size={16} />
              เพิ่มพนักงาน
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {staff.map((s) => (
              <Card key={s.id} className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${s.avatarColor}`}
                >
                  {s.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{s.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {s.position}
                    {s.role === "owner" && !s.position.includes("เจ้าของ") && " · เจ้าของ"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setStaffModalMode({ edit: s })}
                    className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="แก้ไขพนักงาน"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteStaff(s)}
                    className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label="ลบพนักงาน"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">วันหยุด / การลา</h2>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">พนักงาน</th>
                  <th className="px-5 py-3 font-medium">ช่วงวันที่</th>
                  <th className="px-5 py-3 font-medium">ประเภท</th>
                  <th className="px-5 py-3 font-medium">สถานะ</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leaveRequests.map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3 font-medium text-gray-900">{staffName(leave.staffId)}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {format(new Date(leave.dateFrom), "d MMM", { locale: th })}
                      {leave.dateFrom !== leave.dateTo &&
                        ` – ${format(new Date(leave.dateTo), "d MMM", { locale: th })}`}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{LEAVE_TYPE_LABEL[leave.leaveType]}</td>
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
                    <td className="px-5 py-3 text-right">
                      {leave.status === "pending" && (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setLeaveStatus(leave.id, "approved")}
                            className="rounded-full p-1.5 text-emerald-500 hover:bg-emerald-50"
                            aria-label="อนุมัติ"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            onClick={() => setLeaveStatus(leave.id, "rejected")}
                            className="rounded-full p-1.5 text-rose-500 hover:bg-rose-50"
                            aria-label="ไม่อนุมัติ"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {leaveRequests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-400">
                      ยังไม่มีรายการลา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            เงินเดือนประจำเดือน {format(new Date(), "MMMM yyyy", { locale: th })}
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-5 py-3 font-medium">พนักงาน</th>
                  <th className="px-5 py-3 font-medium">เงินเดือนพื้นฐาน</th>
                  <th className="px-5 py-3 font-medium">โบนัส</th>
                  <th className="px-5 py-3 font-medium">หัก</th>
                  <th className="px-5 py-3 font-medium">ยอดสุทธิ</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payroll.map((p) => {
                  const net = p.baseSalary + p.bonus - p.deductions;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3 font-medium text-gray-900">{staffName(p.staffId)}</td>
                      <td className="px-5 py-3 text-gray-600">{currency(p.baseSalary)}</td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min={0}
                          value={p.bonus}
                          onChange={(e) => updatePayroll(p.id, { bonus: Number(e.target.value) })}
                          className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min={0}
                          value={p.deductions}
                          onChange={(e) => updatePayroll(p.id, { deductions: Number(e.target.value) })}
                          className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                        />
                      </td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{currency(net)}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => togglePaid(p.id)}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-medium",
                            p.paidAt
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                          )}
                        >
                          {p.paidAt ? "จ่ายแล้ว" : "ยังไม่จ่าย"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">พนักงานที่ปิดใช้งาน</h2>
          <Card className="space-y-2">
            {inactiveStaff.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${s.avatarColor}`}
                >
                  {s.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{s.name}</p>
                  <p className="truncate text-xs text-gray-400">{s.position}</p>
                </div>
                <button
                  onClick={() => handleReactivate(s)}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white"
                >
                  <RotateCcw size={13} />
                  กู้คืน
                </button>
                <button
                  onClick={() => handlePermanentDelete(s)}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={13} />
                  ลบถาวร
                </button>
              </div>
            ))}
            {inactiveStaff.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-400">ไม่มีพนักงานที่ปิดใช้งาน</p>
            )}
          </Card>
        </section>
      </div>

      {staffModalMode !== "closed" && (
        <StaffModal
          initial={staffModalMode === "create" ? undefined : staffModalMode.edit}
          onClose={() => setStaffModalMode("closed")}
          onSave={handleSaveStaff}
        />
      )}
    </>
  );
}
