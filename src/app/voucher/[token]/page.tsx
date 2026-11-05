import { notFound } from "next/navigation";
import { ContractToolbar } from "@/components/contracts/ContractToolbar";
import { VoucherSignForm } from "@/components/contracts/VoucherSignForm";
import { thaiBahtText, thaiLongDate } from "@/lib/contractTemplate";
import { PRIVATE_PREFIX } from "@/lib/contractServer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const baht = (n: number) => Number(n).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Public, token-gated: the payee reads the payment voucher (ใบสำคัญรับเงิน) and signs that they received it.
export default async function VoucherPage({ params }: { params: { token: string } }) {
  const db = createAdminClient();
  const { data: v } = await db
    .from("contract_payments")
    .select("id, period, description, amount, withholding, net, paid_at, payee_signer_name, payee_signature_path, payee_signed_at, contracts(contract_no, parties)")
    .eq("receipt_token", params.token)
    .maybeSingle();
  if (!v) notFound();
  const c = (Array.isArray(v.contracts) ? v.contracts[0] : v.contracts) as { contract_no: string; parties: { seller: { name: string; address: string }; client: { name: string } } } | null;
  let signatureUrl: string | undefined;
  if (v.payee_signature_path?.startsWith(PRIVATE_PREFIX)) {
    const { data } = await db.storage.from("contracts").createSignedUrl(v.payee_signature_path.slice(PRIVATE_PREFIX.length), 3600);
    signatureUrl = data?.signedUrl;
  }
  const payee = v.payee_signer_name || c?.parties.client.name || "";

  return (
    <div className="min-h-screen bg-gray-100">
      <ContractToolbar fileName={`ใบสำคัญรับเงิน ${payee} ${v.paid_at ?? ""}`.replace(/[\\/:*?"<>|]/g, " ")} />
      <div className="py-6">
        <div id="contract-doc" className="mx-auto w-[210mm] max-w-full bg-white px-[18mm] py-[16mm] text-[13px] leading-relaxed text-gray-900" style={{ fontFamily: "var(--font-prompt)" }}>
          <div className="contract-block">
            <h1 className="mb-6 text-center text-xl font-bold">ใบสำคัญรับเงิน</h1>
            <p className="text-right">วันที่ {thaiLongDate(v.paid_at ?? undefined)}</p>
            <p className="mt-4">
              ข้าพเจ้า <b>{payee}</b> ได้รับเงินจาก <b>{c?.parties.seller.name}</b>
            </p>
            <p>ตามสัญญาเลขที่ {c?.contract_no}{v.period ? ` (งวดเดือน ${v.period})` : ""} ดังรายการต่อไปนี้</p>
            <table className="mt-4 w-full border-collapse text-sm">
              <tbody>
                <tr className="border-b"><td className="py-2">{v.description}</td><td className="py-2 text-right">{baht(v.amount)} บาท</td></tr>
                {Number(v.withholding) > 0 && (
                  <tr className="border-b"><td className="py-2">หัก ภาษีเงินได้ ณ ที่จ่าย 3%</td><td className="py-2 text-right">-{baht(v.withholding)} บาท</td></tr>
                )}
                <tr><td className="py-2 font-semibold">รับเงินสุทธิ</td><td className="py-2 text-right font-semibold">{baht(v.net)} บาท</td></tr>
              </tbody>
            </table>
            <p className="mt-2 text-gray-600">({thaiBahtText(Number(v.net))})</p>
            <div className="mt-10 flex justify-end">
              <div className="w-64 text-center">
                <div className="flex h-20 items-end justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {signatureUrl && <img src={signatureUrl} alt="" crossOrigin="anonymous" className="max-h-20 max-w-full object-contain" />}
                </div>
                <div className="border-t border-gray-400 pt-1.5">
                  <p>ลงชื่อ ผู้รับเงิน</p>
                  <p className="font-medium">( {payee} )</p>
                </div>
              </div>
            </div>
            {v.payee_signed_at && (
              <p className="mt-5 rounded-lg bg-gray-50 px-3 py-2 text-center text-[11px] text-gray-500">
                ผู้รับเงินลงนามอิเล็กทรอนิกส์เมื่อ {new Date(v.payee_signed_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} น.
              </p>
            )}
          </div>
        </div>
        {!v.payee_signed_at && <VoucherSignForm token={params.token} defaultName={payee} />}
      </div>
    </div>
  );
}
