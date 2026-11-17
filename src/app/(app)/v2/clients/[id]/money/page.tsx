"use client";

import { useEffect, useState } from "react";
import Link from "@/components/ui/Link";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { ClientRounds } from "@/components/clients/ClientRounds";
import { listContracts } from "@/lib/supabase/queries";
import type { Contract } from "@/lib/types";
import { useV2Client } from "../useV2Client";

const baht = (n: number) => `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

// New UI: one client's money, one card per package purchase — the status, the quotation,
// invoice, receipt and client files of that purchase all sit inside its card.
export default function V2ClientMoney() {
  const { id, client } = useV2Client();
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    listContracts().then((c) => setContracts(c.filter((x) => x.clientId === id))).catch(() => {});
  }, [id]);

  if (!client) return (<><Topbar back={`/v2/clients/${id}`} title="บัญชี" /><LoadingView /></>);

  return (
    <>
      <Topbar back={`/v2/clients/${id}`} title="บัญชี" subtitle={client.name} />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <ClientRounds client={client} />
        {contracts.length > 0 && (
          <section className="rounded-2xl border border-gray-100 bg-white shadow-card">
            <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">สัญญา</h2>
            <div className="divide-y divide-gray-100">
              {contracts.map((c) => (
                <Link key={c.id} href={`/contracts/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-800">สัญญา {c.contractNo}</span>
                    <span className="block text-xs text-gray-400">{day(c.createdAt)}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-800">{baht(c.totalAmount)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
