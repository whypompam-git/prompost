"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

export function PrintToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <Link href={backHref} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft size={16} />
        กลับ
      </Link>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
      >
        <Printer size={15} />
        พิมพ์ / บันทึกเป็น PDF
      </button>
    </div>
  );
}
