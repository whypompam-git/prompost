"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Package as PackageIcon, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { PackageModal, type PackageFormValues } from "@/components/packages/PackageModal";
import {
  assignPackageToClient,
  createPackageRow,
  deletePackageRow,
  listClientPackages,
  listClients,
  listPackages,
  unassignClientPackage,
  updatePackageRow,
} from "@/lib/supabase/queries";
import type { Client, ClientPackage, Package } from "@/lib/types";

const currency = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0 });
const dateLabel = (iso: string) => format(new Date(iso), "d MMM yyyy", { locale: th });

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [assignments, setAssignments] = useState<ClientPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<"closed" | "create" | { edit: Package }>("closed");
  const [assigningTo, setAssigningTo] = useState<Package | null>(null);
  const [pickedClientId, setPickedClientId] = useState("");

  useEffect(() => {
    Promise.all([listPackages(), listClients(), listClientPackages()])
      .then(([p, c, a]) => {
        setPackages(p);
        setClients(c);
        setAssignments(a);
      })
      .finally(() => setLoading(false));
  }, []);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—";

  async function handleSave(values: PackageFormValues) {
    if (modalMode === "create") {
      const created = await createPackageRow(values);
      setPackages((prev) => [created, ...prev]);
    } else if (modalMode !== "closed") {
      const { edit } = modalMode;
      await updatePackageRow(edit.id, values);
      setPackages((prev) => prev.map((p) => (p.id === edit.id ? { ...p, ...values } : p)));
    }
    setModalMode("closed");
  }

  async function handleDelete(pkg: Package) {
    if (!window.confirm(`ลบแพ็คเกจ "${pkg.name}" ใช่ไหม?`)) return;
    setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
    try {
      await deletePackageRow(pkg.id);
    } catch (err) {
      console.error(err);
      setPackages((prev) => [pkg, ...prev]);
      window.alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  async function handleAssign() {
    if (!assigningTo || !pickedClientId) return;
    const created = await assignPackageToClient(pickedClientId, assigningTo.id);
    setAssignments((prev) => [created, ...prev]);
    setAssigningTo(null);
    setPickedClientId("");
  }

  async function handleUnassign(assignment: ClientPackage) {
    setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
    try {
      await unassignClientPackage(assignment.id);
    } catch (err) {
      console.error(err);
      setAssignments((prev) => [assignment, ...prev]);
      window.alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="แพ็คเกจ" subtitle="แพ็คเกจที่ขายและลูกค้าที่ใช้งานอยู่" />
        <LoadingView />
      </>
    );
  }

  return (
    <>
      <Topbar title="แพ็คเกจ" subtitle="แพ็คเกจที่ขายและลูกค้าที่ใช้งานอยู่" />
      <div className="flex-1 space-y-4 p-6">
        <div className="flex justify-end">
          <button
            onClick={() => setModalMode("create")}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            เพิ่มแพ็คเกจใหม่
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {packages.map((pkg) => {
            const pkgAssignments = assignments.filter((a) => a.packageId === pkg.id);
            return (
              <Card key={pkg.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <PackageIcon size={16} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{pkg.name}</p>
                      <p className="text-sm font-medium text-brand-600">฿{currency(pkg.price)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setModalMode({ edit: pkg })}
                      className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      aria-label="แก้ไขแพ็คเกจ"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(pkg)}
                      className="rounded-full p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="ลบแพ็คเกจ"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {pkg.description && <p className="text-sm text-gray-600">{pkg.description}</p>}

                {(pkg.startDate || pkg.endDate) && (
                  <p className="text-xs text-gray-400">
                    ใช้ได้: {pkg.startDate ? dateLabel(pkg.startDate) : "—"}
                    {" – "}
                    {pkg.endDate ? dateLabel(pkg.endDate) : "—"}
                  </p>
                )}

                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      ลูกค้าที่ใช้แพ็คเกจนี้
                    </p>
                    <button
                      onClick={() => setAssigningTo(pkg)}
                      className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      <UserPlus size={13} />
                      เพิ่มลูกค้า
                    </button>
                  </div>
                  {pkgAssignments.length === 0 ? (
                    <p className="text-xs text-gray-400">ยังไม่มีลูกค้าใช้แพ็คเกจนี้</p>
                  ) : (
                    <div className="space-y-1.5">
                      {pkgAssignments.map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-xs">
                          <span className="font-medium text-gray-700">{clientName(a.clientId)}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">{dateLabel(a.assignedAt)}</span>
                            <button
                              onClick={() => handleUnassign(a)}
                              className="rounded-full p-0.5 text-gray-300 hover:bg-gray-100 hover:text-rose-500"
                              aria-label="เอาออก"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
          {packages.length === 0 && (
            <Card className="text-sm text-gray-400 lg:col-span-2">
              ยังไม่มีแพ็คเกจ — กด &quot;เพิ่มแพ็คเกจใหม่&quot; ด้านบน
            </Card>
          )}
        </div>
      </div>

      {modalMode !== "closed" && (
        <PackageModal
          initial={modalMode === "create" ? undefined : modalMode.edit}
          onClose={() => setModalMode("closed")}
          onSave={handleSave}
        />
      )}

      {assigningTo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                เพิ่มลูกค้าเข้าแพ็คเกจ &quot;{assigningTo.name}&quot;
              </h3>
              <button
                onClick={() => setAssigningTo(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>
            <select
              value={pickedClientId}
              onChange={(e) => setPickedClientId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="">เลือกลูกค้า</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setAssigningTo(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAssign}
                disabled={!pickedClientId}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                เพิ่ม
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
