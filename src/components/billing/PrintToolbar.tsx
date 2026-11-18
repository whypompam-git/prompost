"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Loader2 } from "lucide-react";

// Sticky bar for billing documents: back + real PDF download. Public share
// pages pass no backHref — the back button then only appears when there is
// history to go back to (e.g. arriving from the client portal).
// the phone preview is shrunk with a transform: capture the document at its real size
const unscale = (doc: Document) => {
  let n: HTMLElement | null = doc.getElementById("billing-doc");
  while (n) {
    n.style.transform = "none";
    if (n.id !== "billing-doc") n.style.height = "auto";
    n = n.parentElement;
  }
};

export function PrintToolbar({ backHref, fileName }: { backHref?: string; fileName: string }) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(Boolean(backHref));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = fileName;
  }, [fileName]);

  useEffect(() => {
    setCanGoBack(Boolean(backHref) || window.history.length > 1);
  }, [backHref]);

  function goBack() {
    if (window.history.length > 1) router.back();
    else if (backHref) router.push(backHref);
  }

  // the same full-size document, saved as a sharp PNG (3x) so nothing gets softer when it is forwarded
  async function downloadPng() {
    const el = document.getElementById("billing-doc");
    if (!el) return;
    setBusy(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(el, { scale: 3, backgroundColor: "#ffffff", useCORS: true, onclone: unscale });
      const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/png"));
      if (!blob) throw new Error("png failed");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${fileName}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    } catch (err) {
      console.error(err);
      window.alert("บันทึกเป็นรูปไม่สำเร็จ ลองPDF แทน");
    } finally {
      setBusy(false);
    }
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
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, onclone: unscale });
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = 210;
      const pageH = 297;
      const imgH = (canvas.height * pageW) / canvas.width;
      const img = canvas.toDataURL("image/jpeg", 0.95);
      // Keep a document on ONE page whenever shrinking stays readable
      // (≥75%) — float rounding alone used to spill a blank second page.
      const fit = pageH / imgH;
      if (fit >= 0.75) {
        const w = pageW * Math.min(fit, 1);
        const h = imgH * Math.min(fit, 1);
        pdf.addImage(img, "JPEG", (pageW - w) / 2, 0, w, h);
      } else {
        let offset = 0;
        pdf.addImage(img, "JPEG", 0, 0, pageW, imgH);
        while (imgH - offset > pageH + 1) {
          offset += pageH;
          pdf.addPage();
          pdf.addImage(img, "JPEG", 0, -offset, pageW, imgH);
        }
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
          onClick={downloadPng}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg border border-brand-300 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          PNG
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
