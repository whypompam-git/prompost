import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { mockClients } from "@/lib/mock-data";

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
  return (
    <>
      <Topbar title="ลูกค้า" subtitle="ข้อมูลลูกค้าและสถานะการชำระเงิน" />
      <div className="flex-1 space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockClients.map((client) => (
            <Card key={client.id} className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{client.name}</p>
                  <p className="text-sm text-gray-500">{client.contactName}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${PAYMENT_STYLE[client.paymentStatus]}`}
                >
                  {PAYMENT_LABEL[client.paymentStatus]}
                </span>
              </div>
              <p className="text-sm text-gray-500">{client.phone}</p>
              <p className="truncate text-xs text-gray-400">
                พอร์ทัลลูกค้า: /portal/{client.portalToken}
              </p>
            </Card>
          ))}
        </div>
        <Card className="text-sm text-gray-500">
          หน้านี้เป็นจุดเริ่มต้น — ขั้นถัดไปคือฟอร์มเพิ่ม/แก้ไขลูกค้า และเชื่อมข้อมูลจริงจาก Supabase
        </Card>
      </div>
    </>
  );
}
