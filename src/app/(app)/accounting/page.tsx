import { FileText, Receipt, Wallet } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";

const CARDS = [
  { icon: FileText, title: "ใบเสนอราคา", desc: "สร้างใบเสนอราคา คำนวณ VAT และหัก ณ ที่จ่าย" },
  { icon: Receipt, title: "ใบเสร็จรับเงิน", desc: "ออกใบเสร็จรับเงินให้ลูกค้า" },
  { icon: Wallet, title: "รายรับ-รายจ่าย", desc: "บันทึกรายการพร้อมแนบสลิปโอนเงิน" },
];

export default function AccountingPage() {
  return (
    <>
      <Topbar title="บัญชี" subtitle="ใบเสนอราคา ใบเสร็จ และรายรับ-รายจ่าย" />
      <div className="flex-1 space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {CARDS.map((c) => (
            <Card key={c.title} className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <c.icon size={18} />
              </div>
              <p className="font-medium text-gray-900">{c.title}</p>
              <p className="text-sm text-gray-500">{c.desc}</p>
            </Card>
          ))}
        </div>
        <Card className="text-sm text-gray-500">
          หน้านี้ยังเป็นโครงเริ่มต้น — ดูโครงสร้างตารางที่รองรับไว้แล้วใน supabase/migrations/0001_init.sql
        </Card>
      </div>
    </>
  );
}
