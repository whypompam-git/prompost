const currency = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0 });

export function BalanceSummary({
  billed,
  paid,
  outstanding,
}: {
  billed: number;
  paid: number;
  outstanding: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <div className="rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-card sm:p-4">
        <p className="text-[11px] text-gray-500 sm:text-xs">ยอดที่แจ้งชำระ</p>
        <p className="mt-1 text-base font-semibold text-gray-900 sm:text-xl">฿{currency(billed)}</p>
      </div>
      <div className="rounded-2xl bg-emerald-50 p-3 text-center sm:p-4">
        <p className="text-[11px] text-emerald-700 sm:text-xs">ชำระแล้ว</p>
        <p className="mt-1 text-base font-semibold text-emerald-700 sm:text-xl">฿{currency(paid)}</p>
      </div>
      <div className={`rounded-2xl p-3 text-center sm:p-4 ${outstanding > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
        <p className={`text-[11px] sm:text-xs ${outstanding > 0 ? "text-amber-700" : "text-gray-500"}`}>ค้างชำระ</p>
        <p className={`mt-1 text-base font-semibold sm:text-xl ${outstanding > 0 ? "text-amber-700" : "text-gray-500"}`}>
          ฿{currency(outstanding)}
        </p>
      </div>
    </div>
  );
}
