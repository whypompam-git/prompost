"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getClient, getClientCi } from "@/lib/supabase/queries";
import type { Client } from "@/lib/types";

// The client of a /v2/clients/[id]/… page, plus its logo.
export function useV2Client() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [logo, setLogo] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    getClient(id)
      .then((c) => live && setClient(c))
      .finally(() => live && setLoading(false));
    getClientCi(id)
      .then((ci) => live && setLogo(ci.logoUrl))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [id]);
  return { id, client, logo: logo || client?.brandImages?.[0] || "", loading };
}
