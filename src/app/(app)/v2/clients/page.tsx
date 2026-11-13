"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { AppGrid, ClientTile } from "@/components/v2/AppGrid";
import { listClientLogos, listClients, listTasksLite } from "@/lib/supabase/queries";
import type { Client, Task } from "@/lib/types";

// New UI: clients as a grid of app icons — just logo + name; everything else is inside.
export default function V2ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [tasks, setTasks] = useState<Task[]>([]);
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
    listTasksLite().then(setTasks).catch(() => {});
  }, []);

  // red dot = the client sent something back or is waiting to check a clip
  const needs = useMemo(() => {
    const s = new Set<string>();
    for (const t of tasks) if (t.type === "pending" || ((t.type === "edit" || t.type === "qc") && (t.revisionCount ?? 0) > 0)) s.add(t.clientId);
    return s;
  }, [tasks]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.nameEn ?? "").toLowerCase().includes(q))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.name.localeCompare(b.name, "th"));
  }, [clients, query]);

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
        {loading ? (
          <LoadingView />
        ) : (
          <AppGrid>
            {shown.map((c) => (
              <ClientTile key={c.id} href={`/v2/clients/${c.id}`} name={c.name} logo={logos[c.id] || c.brandImages?.[0]} color={c.colorTag} alert={needs.has(c.id)} />
            ))}
          </AppGrid>
        )}
        {!loading && shown.length === 0 && <p className="py-10 text-center text-sm text-gray-400">ไม่พบลูกค้า</p>}
      </div>
    </>
  );
}
