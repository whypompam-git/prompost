"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import type { Staff } from "@/lib/types";

// Copies the account number so the owner can paste it straight into their
// own banking app, and shows the bank + account name so they know where
// the money is going.
export function PayoutButton({ staff }: { staff: Staff }) {
  const [copied, setCopied] = useState(false);

  if (!staff.bankAccountNo) {
    return <p className="text-xs text-gray-300">ยังไม่ได้ผูกบัญชี</p>;
  }

  const detail = `${staff.bankName ?? "ไม่ระบุธนาคาร"} · ${staff.bankAccountName ?? staff.name}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(staff.bankAccountNo!.replace(/-/g, ""));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert(`เลขบัญชี: ${staff.bankAccountNo}\n${detail}`);
    }
  }

  return (
    <div className="text-right">
      <button
        onClick={handleCopy}
        className="flex flex-col items-end gap-0.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
      >
        <span className="flex items-center gap-1">
          <Copy size={13} />
          {copied ? "คัดลอกแล้ว" : "คัดลอกเลขบัญชี"}
        </span>
        <span className="font-normal text-brand-500">{detail}</span>
      </button>
    </div>
  );
}
