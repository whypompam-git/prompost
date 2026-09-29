"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { THAI_BANKS } from "@/lib/thaiBanks";
import type { Staff } from "@/lib/types";

// One-tap payout: copies the account number, then best-effort opens the
// staff member's banking app via its (undocumented) URL scheme — nothing
// can be pre-filled from outside the app, so the owner still pastes the
// number once they're in the transfer screen.
export function PayoutButton({ staff, onPaid }: { staff: Staff; onPaid: () => void }) {
  const [copied, setCopied] = useState(false);
  const bank = THAI_BANKS.find((b) => b.name === staff.bankName);

  if (!staff.bankAccountNo) {
    return <p className="text-xs text-gray-300">ยังไม่ได้ผูกบัญชี</p>;
  }

  async function handlePay() {
    try {
      await navigator.clipboard.writeText(staff.bankAccountNo!.replace(/-/g, ""));
      setCopied(true);
    } catch {
      // clipboard unavailable — still try to open the app
    }
    if (bank) window.location.href = bank.scheme;
    if (window.confirm(`คัดลอกเลขบัญชี ${staff.bankAccountNo} แล้ว${bank ? " และเปิดแอปธนาคารให้" : ""}\n\nทำเครื่องหมายว่าจ่ายแล้วเลยไหม?`)) {
      onPaid();
    }
  }

  return (
    <div className="text-right">
      <button
        onClick={handlePay}
        className="flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
        title={`${staff.bankName ?? ""} ${staff.bankAccountNo}${staff.bankAccountName ? " · " + staff.bankAccountName : ""}`}
      >
        <CreditCard size={13} />
        {copied ? "คัดลอกแล้ว" : "จ่ายเงิน"}
      </button>
    </div>
  );
}
