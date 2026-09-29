"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import type { Staff } from "@/lib/types";

// Copies the account number so the owner can paste it straight into their
// own banking app, then offers to mark the entry as paid.
export function PayoutButton({ staff, onPaid }: { staff: Staff; onPaid: () => void }) {
  const [copied, setCopied] = useState(false);

  if (!staff.bankAccountNo) {
    return <p className="text-xs text-gray-300">ยังไม่ได้ผูกบัญชี</p>;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(staff.bankAccountNo!.replace(/-/g, ""));
      setCopied(true);
    } catch {
      window.alert(`เลขบัญชี: ${staff.bankAccountNo}`);
    }
    if (window.confirm(`คัดลอกเลขบัญชี ${staff.bankAccountNo} แล้ว\n\nทำเครื่องหมายว่าจ่ายแล้วเลยไหม?`)) {
      onPaid();
    }
  }

  return (
    <div className="text-right">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
        title={`${staff.bankName ?? ""} ${staff.bankAccountNo}${staff.bankAccountName ? " · " + staff.bankAccountName : ""}`}
      >
        <Copy size={13} />
        {copied ? "คัดลอกแล้ว" : "คัดลอกเลขบัญชี"}
      </button>
    </div>
  );
}
