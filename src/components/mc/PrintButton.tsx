"use client";

import { Printer } from "lucide-react";

// "Save as PDF" is the browser's print dialog (hidden when printing).
export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 print:hidden">
      <Printer size={15} />
      บันทึกเป็น PDF
    </button>
  );
}
