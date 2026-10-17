import type { Contract } from "@/lib/types";

// Everything that makes up the agreed text. The SHA-256 of this is stored when
// the client signs, so any later change to the contract is detectable.
export function contractFingerprintSource(c: {
  contractNo: string;
  title: string;
  signDate: string;
  startDate?: string;
  endDate?: string;
  totalAmount: number;
  installments: Contract["installments"];
  parties: Contract["parties"];
  intro: string;
  clauses: Contract["clauses"];
  closing: string;
}): string {
  return JSON.stringify({
    no: c.contractNo,
    title: c.title,
    signDate: c.signDate,
    startDate: c.startDate ?? null,
    endDate: c.endDate ?? null,
    total: c.totalAmount,
    installments: c.installments,
    parties: c.parties,
    intro: c.intro,
    clauses: c.clauses,
    closing: c.closing,
  });
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
