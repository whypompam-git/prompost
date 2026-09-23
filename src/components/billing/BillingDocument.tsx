import type { AgencySettings, QuotationItem } from "@/lib/types";

const currency = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });

export type BillingDocType = "quotation" | "receipt" | "invoice";

const DOC_TITLE: Record<BillingDocType, { th: string; en: string }> = {
  quotation: { th: "ใบเสนอราคา", en: "QUOTATION" },
  receipt: { th: "ใบเสร็จรับเงิน", en: "RECEIPT" },
  invoice: { th: "ใบแจ้งหนี้", en: "INVOICE" },
};

export function BillingDocument({
  docType,
  docNo,
  date,
  validUntil,
  seller,
  buyer,
  items,
  vatPercent,
  whtPercent,
  paymentNote,
  notes,
}: {
  docType: BillingDocType;
  docNo: string;
  date: string;
  validUntil?: string;
  seller: AgencySettings;
  buyer: { name: string; address?: string; phone?: string; taxId?: string };
  items: QuotationItem[];
  vatPercent: number;
  whtPercent: number;
  paymentNote?: string;
  notes?: string;
}) {
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const vat = (subtotal * vatPercent) / 100;
  const wht = (subtotal * whtPercent) / 100;
  const total = subtotal + vat - wht;
  const title = DOC_TITLE[docType];

  return (
    <div className="mx-auto w-[210mm] min-h-[297mm] bg-white p-[15mm] text-gray-900 print:p-[15mm] print:shadow-none" style={{ fontFamily: "var(--font-prompt)" }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title.th}</h1>
          <p className="text-sm text-gray-500">{title.en}</p>
        </div>
        <div className="text-right text-sm">
          <p>
            เลขที่: <span className="font-semibold">{docNo}</span>
          </p>
          <p>วันที่: {dateLabel(date)}</p>
          {validUntil && <p>ยืนราคาถึง: {dateLabel(validUntil)}</p>}
        </div>
      </div>

      <hr className="my-5 border-gray-900" />

      <div className="grid grid-cols-2 gap-8 text-sm">
        <div>
          <p className="mb-1 text-gray-500">ผู้เสนอราคา</p>
          <p className="font-semibold">{seller.name || "—"}</p>
          {seller.address && <p>{seller.address}</p>}
          {seller.phone && <p>โทร: {seller.phone}</p>}
          {seller.taxId && <p>เลขประจำตัวผู้เสียภาษี: {seller.taxId}</p>}
        </div>
        <div>
          <p className="mb-1 text-gray-500">เสนอราคาให้</p>
          <p className="font-semibold">{buyer.name}</p>
          {buyer.address && <p>{buyer.address}</p>}
          {buyer.phone && <p>โทร: {buyer.phone}</p>}
          {buyer.taxId && <p>เลขทะเบียนนิติบุคคล: {buyer.taxId}</p>}
        </div>
      </div>

      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b-2 border-gray-900">
            <th className="py-2 font-semibold">รายการ</th>
            <th className="py-2 text-right font-semibold">จำนวน</th>
            <th className="py-2 text-right font-semibold">ราคา/หน่วย</th>
            <th className="py-2 text-right font-semibold">รวม</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-gray-200 align-top">
              <td className="py-3 pr-4 whitespace-pre-wrap">{item.description}</td>
              <td className="py-3 text-right">{item.qty}</td>
              <td className="py-3 text-right">{currency(item.unitPrice)}</td>
              <td className="py-3 text-right">{currency(item.qty * item.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>รวมเป็นเงิน</span>
            <span>{currency(subtotal)}</span>
          </div>
          {vatPercent > 0 && (
            <div className="flex justify-between">
              <span>VAT {vatPercent}%</span>
              <span>{currency(vat)}</span>
            </div>
          )}
          {whtPercent > 0 && (
            <div className="flex justify-between">
              <span>หัก ณ ที่จ่าย {whtPercent}%</span>
              <span>-{currency(wht)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-900 pt-1 text-base font-bold">
            <span>ยอดรวมทั้งสิ้น</span>
            <span>{currency(total)} บาท</span>
          </div>
        </div>
      </div>

      {(paymentNote || notes) && (
        <div className="mt-8 space-y-3 text-sm">
          {paymentNote && (
            <div>
              <p className="font-semibold">ช่องทางการชำระเงิน</p>
              <p className="whitespace-pre-wrap text-gray-700">{paymentNote}</p>
            </div>
          )}
          {notes && (
            <div>
              <p className="font-semibold">หมายเหตุ</p>
              <p className="whitespace-pre-wrap text-gray-700">{notes}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-16 grid grid-cols-2 gap-8 text-center text-sm">
        <div>
          <div className="mb-2 h-12" />
          <div className="border-t border-gray-400 pt-2">
            <p>ผู้เสนอราคา</p>
            <p className="font-medium">{seller.name || "—"}</p>
          </div>
        </div>
        <div>
          <div className="mb-2 h-12" />
          <div className="border-t border-gray-400 pt-2">
            <p>ผู้อนุมัติ / ลูกค้า</p>
          </div>
        </div>
      </div>
    </div>
  );
}
