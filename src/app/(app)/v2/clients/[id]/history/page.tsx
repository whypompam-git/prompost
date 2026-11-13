"use client";

import { useRouter } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { ClientHistoryModal } from "@/components/clients/ClientHistoryModal";
import { useV2Client } from "../useV2Client";

// New UI: the client's chat history (calls/meetings + team notes tagged to the client).
export default function V2ClientHistory() {
  const router = useRouter();
  const { id, client, loading } = useV2Client();
  return (
    <>
      <Topbar back={`/v2/clients/${id}`} title="ประวัติการคุย" subtitle={client?.name} />
      {loading && <LoadingView />}
      {client && <ClientHistoryModal client={client} onClose={() => router.push(`/v2/clients/${id}`)} />}
    </>
  );
}
