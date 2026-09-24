"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Loader2 } from "lucide-react";

// Sticky bar for billing documents: back + real PDF download. Public share
// pages pass no backHref — the back button then only appears when there is
// history to go back to (e.g. arriving from the client portal).
export function PrintToolbar({ backHref, fileName }: { backHref?: string; fileName: string }) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(Boolean(backHref));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCanGoBack(Boolean(backHref) || window.history.length > 1);
  }, [backHref]);

  function goBack() {
    if (window.history.length > 1) router.back();
    else if (backHref) router.push(backHref);
  }

  async function download() {
    const el = document.getElementById("billing-doc");
    if (!el) return window.print();
    setBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = 210;
      const pageH = 297;
      const imgH = (canvas.height * pageW) / canvas.width;
      const img = canvas.toDataURL("image/jpeg", 0.95);
      let offset = 0;
      pdf.addImage(img, "JPEG", 0, 0, pageW, imgH);
      while (imgH - offset > pageH) {
        offset += pageH;
        pdf.addPage();
        pdf.addImage(img, "JPEG", 0, -offset, pageW, imgH);
      }
      pdf.save(`${fileName}.pdf`);
    } catch (err) {
      console.error(err);
      window.print();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      {canGoBack ? (
        <button onClick={goBack} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft size={16} />
          กลับ
        </button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.print()}
          className="hidden rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 sm:block"
        >
          พิมพ์
        </button>
        <button
          onClick={download}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          ดาวน์โหลด PDF
        </button>
      </div>
    </div>
  );
}
