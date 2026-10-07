// "Quotation <company> <doc no>" — used for the PDF download name and the
// page title (browser "Save as PDF" takes its file name from the title).
export function docFileName(kind: "Quotation" | "Invoice" | "Receipt", buyerName: string, docNo: string) {
  return `${kind} ${buyerName} ${docNo}`.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
}
