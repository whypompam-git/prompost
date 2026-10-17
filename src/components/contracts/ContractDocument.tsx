import type { Contract } from "@/lib/types";
import { thaiLongDate } from "@/lib/contractTemplate";

const stamp = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });

function Party({ role, p }: { role: string; p: Contract["parties"]["client"] }) {
  return (
    <div className="space-y-0.5">
      <p>
        <span className="font-semibold">{role}:</span> {p.name || "—"}
      </p>
      <p>ที่อยู่: {p.address || "—"}</p>
      <p>เลขประจำตัวผู้เสียภาษี / เลขบัตรประชาชน: {p.taxId || "—"}</p>
      <p>โทรศัพท์: {p.phone || "—"}</p>
    </div>
  );
}

// Every direct child of #contract-doc with class "contract-block" is a unit the
// PDF export never splits across pages (see ContractToolbar).
export function ContractDocument({ contract }: { contract: Contract }) {
  const { parties } = contract;
  const signed = contract.status === "signed";

  return (
    <div
      id="contract-doc"
      className="mx-auto w-[210mm] bg-white px-[18mm] py-[16mm] text-[13px] leading-relaxed text-gray-900"
      style={{ fontFamily: "var(--font-prompt)" }}
    >
      <div className="contract-block">
        <div className="mb-1 flex items-start justify-between text-xs text-gray-500">
          <span>เลขที่สัญญา: {contract.contractNo}</span>
          <span>วันที่: {thaiLongDate(contract.signDate)}</span>
        </div>
        <h1 className="my-4 text-center text-xl font-bold">{contract.title}</h1>
        <p className="mb-3 whitespace-pre-wrap">{contract.intro}</p>
        <div className="space-y-3">
          <Party role="ผู้ว่าจ้าง" p={parties.client} />
          <p className="text-gray-700">(ซึ่งต่อไปในสัญญานี้จะเรียกว่า “ผู้ว่าจ้าง”) ฝ่ายหนึ่ง กับ</p>
          <Party role="ผู้รับจ้าง" p={parties.seller} />
          <p className="text-gray-700">(ซึ่งต่อไปในสัญญานี้จะเรียกว่า “ผู้รับจ้าง”) อีกฝ่ายหนึ่ง</p>
          <p>คู่สัญญาทั้งสองฝ่ายตกลงทำสัญญากันโดยมีข้อความและเงื่อนไขดังต่อไปนี้:</p>
        </div>
      </div>

      {contract.clauses.map((c, i) => (
        <div key={i} className="contract-block mt-4">
          <p className="mb-1 font-semibold">{c.heading}</p>
          <p className="whitespace-pre-wrap text-gray-800">{c.body}</p>
        </div>
      ))}

      <div className="contract-block mt-6">
        <p className="whitespace-pre-wrap">{contract.closing}</p>
        <div className="mt-6 grid grid-cols-2 gap-10 text-center">
          <div>
            <div className="flex h-24 items-end justify-center">
              {contract.clientSignatureUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={contract.clientSignatureUrl} alt="" crossOrigin="anonymous" className="max-h-24 max-w-full object-contain" />
              )}
            </div>
            <div className="border-t border-gray-400 pt-1.5">
              <p>ลงชื่อ (ผู้ว่าจ้าง)</p>
              <p className="font-medium">( {contract.clientSignerName || parties.client.name || "............................"} )</p>
              <p className="text-xs text-gray-500">
                วันที่: {signed && contract.clientSignedAt ? thaiLongDate(contract.clientSignedAt) : "............. / ............. / ............."}
              </p>
            </div>
          </div>
          <div>
            <div className="flex h-24 items-end justify-center">
              {contract.sellerSignatureUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={contract.sellerSignatureUrl} alt="" crossOrigin="anonymous" className="max-h-24 max-w-full object-contain" />
              )}
            </div>
            <div className="border-t border-gray-400 pt-1.5">
              <p>ลงชื่อ (ผู้รับจ้าง)</p>
              <p className="font-medium">( {parties.seller.name || "............................"} )</p>
              <p className="text-xs text-gray-500">วันที่: {thaiLongDate(contract.signDate)}</p>
            </div>
          </div>
        </div>
        {signed && contract.clientSignedAt && (
          <p className="mt-5 rounded-lg bg-gray-50 px-3 py-2 text-center text-[11px] text-gray-500">
            ผู้ว่าจ้างลงนามอิเล็กทรอนิกส์เมื่อ {stamp(contract.clientSignedAt)} น.
            {contract.contentHash ? ` · รหัสตรวจสอบเอกสาร ${contract.contentHash.slice(0, 16)}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
