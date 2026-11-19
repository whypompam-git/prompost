"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { AppGrid, ClientTile } from "@/components/v2/AppGrid";
import { listClientLogos, listClients } from "@/lib/supabase/queries";
import { clientReasons, reasonText, type BadgeData, type ClientReasons } from "@/lib/reviewBadge";
import type { Client } from "@/lib/types";

const total = (r?: ClientReasons) => (r ? r.review + r.deliver + r.revise : 0);

// New UI: clients as a grid of app icons — just logo + name; everything else is inside.
export default function V2ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [badge, setBadge] = useState<BadgeData | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listClients(), listClientLogos().catch(() => ({}) as Record<string, string>)])
      .then(([c, l]) => {
        setClients(c);
        setLogos(l);
      })
      .finally(() => setLoading(false));
    // the red dots fill in after the grid shows
    fetch("/api/drafts/badge", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject())).then(setBadge).catch(() => {});
  }, []);

  // red number = clips waiting for us in this client (waiting for QC, being re-edited after a
  // revision request, or approved and still to be put on Drive); the text under the name says which.
  const needs = useMemo(() => (badge ? clientReasons(badge) : new Map<string, ClientReasons>()), [badge]);

  // groups: customers, and each of our own channels (พร้อมโพส, Tradetalk, …)
  const [group, setGroup] = useState<string>("all");
  const categories = useMemo(() => [...new Set(clients.map((c) => c.category).filter((x): x is string => Boolean(x)))].sort((a, b) => a.localeCompare(b, "th")), [clients]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => group === "all" || (group === "customer" ? !c.category : c.category === group))
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.nameEn ?? "").toLowerCase().includes(q))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.name.localeCompare(b.name, "th"));
  }, [clients, query, group]);

  return (
    <>
      <Topbar title="ลูกค้า" subtitle={`${clients.length} ราย`} />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาลูกค้า"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </label>
        {categories.length > 0 && (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1">
            {([["all", "ทั้งหมด"], ["customer", "ลูกค้า"], ...categories.map((c) => [c, c])] as [string, string][]).map(([k, label]) => (
              <button key={k} onClick={() => setGroup(k)} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${group === k ? "border-brand-500 bg-brand-500 text-white" : "border-gray-200 bg-white text-gray-600"}`}>
                {label}
              </button>
            ))}
          </div>
        )}
        {loading ? (
          <LoadingView />
        ) : (
          <AppGrid>
            {shown.map((c) => (
              <ClientTile key={c.id} href={`/v2/clients/${c.id}`} name={c.parentId ? `${clients.find((x) => x.id === c.parentId)?.name ?? ""} · ${c.name}` : c.name} logo={logos[c.id] || c.brandImages?.[0]} color={c.colorTag} alert={total(needs.get(c.id))} reason={needs.get(c.id) ? reasonText(needs.get(c.id)!) : undefined} />
            ))}
          </AppGrid>
        )}
        {!loading && shown.length === 0 && <p className="py-10 text-center text-sm text-gray-400">ไม่พบลูกค้า</p>}
      </div>
    </>
  );
}
