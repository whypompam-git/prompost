"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { LoadingView } from "@/components/ui/LoadingView";
import { ClientModal, type ClientFormValues } from "@/components/clients/ClientModal";
import { createClientRow, listClients, updateClientRow } from "@/lib/supabase/queries";
import type { Client } from "@/lib/types";

const PAYMENT_LABEL = {
  unpaid: "ยังไม่ชำระ",
  deposit: "มัดจำแล้ว",
  paid: "ชำระครบแล้ว",
} as const;

const PAYMENT_STYLE = {
  unpaid: "bg-rose-100 text-rose-700",
  deposit: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
} as const;

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<"closed" | "create" | { edit: Client }>("closed");

  useEffect(() => {
    listClients()
      .then(setClients)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(values: ClientFormValues) {
    if (modalMode === "create") {
      const created = await createClientRow(values);
      setClients((prev) => [created, ...prev]);
    } else if (modalMode !== "closed") {
      const { edit } = modalMode;
      await updateClientRow(edit.id, values);
      setClients((prev) => prev.map((c) => (c.id === edit.id ? { ...c, ...values } : c)));
    }
    setModalMode("closed");
  }

  if (loading) {
    return (
      <>
        <Topbar title="ลูกค้า" subtitle="ข้อมูลลูกค้าและสถานะการชำระเงิน" />
        <LoadingView />
      </>
    );
  }

  return (
    <>
      <Topbar title="ลูกค้า" subtitle="ข้อมูลลูกค้าและสถานะการชำระเงิน" />
      <div className="flex-1 space-y-4 p-6">
        <div className="flex justify-end">
          <button
            onClick={() => setModalMode("create")}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            เพิ่มลูกค้าใหม่
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{client.name}</p>
                  <p className="text-sm text-gray-500">{client.contactName}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${PAYMENT_STYLE[client.paymentStatus]}`}
                  >
                    {PAYMENT_LABEL[client.paymentStatus]}
                  </span>
                  <button
                    onClick={() => setModalMode({ edit: client })}
                    className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="แก้ไขลูกค้า"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500">{client.phone}</p>
              <p className="truncate text-xs text-gray-400">
                พอร์ทัลลูกค้า: /portal/{client.portalToken}
              </p>
            </Card>
          ))}
          {clients.length === 0 && (
            <Card className="text-sm text-gray-400 sm:col-span-2 lg:col-span-3">
              ยังไม่มีลูกค้า — กด &quot;เพิ่มลูกค้าใหม่&quot; ด้านบน
            </Card>
          )}
        </div>
      </div>

      {modalMode !== "closed" && (
        <ClientModal
          initial={modalMode === "create" ? undefined : modalMode.edit}
          onClose={() => setModalMode("closed")}
          onSave={handleSave}
        />
      )}
    </>
  );
}
