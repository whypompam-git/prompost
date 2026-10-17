"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Loader2 } from "lucide-react";

// Multi-page A4 PDF of #contract-doc. The page is rasterised once, then cut
// into pages only between .contract-block elements (a clause is never split),
// with white masks hiding the neighbouring pages' content.
export function ContractToolbar({ backHref, fileName }: { backHref?: string; fileName: string }) {
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

  async function download() {
    const el = document.getElementById("contract-doc");
    if (!el) return window.print();
    setBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const pxToMm = 210 / el.offsetWidth; // CSS px -> mm on the A4 page
      const pageH = 297;
      const margin = 12;
      const usable = pageH - margin * 2;

      const docTop = el.getBoundingClientRect().top;
      const blocks = Array.from(el.querySelectorAll<HTMLElement>(".contract-block")).map((b) => {
        const r = b.getBoundingClientRect();
        return { top: (r.top - docTop) * pxToMm, bottom: (r.bottom - docTop) * pxToMm };
      });
      const totalH = el.offsetHeight * pxToMm;

      // greedy page starts: break before the first block that would overflow
      const starts = [0];
      for (const b of blocks) {
        const start = starts[starts.length - 1];
        if (b.bottom - start > usable && b.top > start + 1) starts.push(b.top);
        else if (b.bottom - start > usable) starts.push(start + usable); // one block taller than a page
      }

      const img = canvas.toDataURL("image/jpeg", 0.95);
      const imgH = (canvas.height * 210) / canvas.width;
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      starts.forEach((start, i) => {
        if (i > 0) pdf.addPage();
        const end = i + 1 < starts.length ? starts[i + 1] : totalH;
        pdf.addImage(img, "JPEG", 0, margin - start, 210, imgH);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, 210, margin, "F"); // hide the previous page's tail
        pdf.rect(0, margin + (end - start), 210, pageH, "F"); // hide the next page's head
      });
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
      <button
        onClick={download}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        ดาวน์โหลด PDF
      </button>
    </div>
  );
}
