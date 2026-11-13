"use client";

import { Camera, Clapperboard, ExternalLink, Info, MessagesSquare, Palette, Sparkles, Wallet } from "lucide-react";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingView } from "@/components/ui/LoadingView";
import { AppGrid, FeatureTile, initials } from "@/components/v2/AppGrid";
import { useAuth } from "@/lib/auth/AuthContext";
import { PALETTE, type ColorStem } from "@/lib/colors";
import { clientLinkPath } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { useV2Client } from "./useV2Client";

// New UI: one client's home — a grid of what you can do for this client.
export default function V2ClientHome() {
  const auth = useAuth();
  const { id, client, logo, loading } = useV2Client();
  const isOwner = auth.role === "owner";
  const canMoney = isOwner || auth.permissions.documents || auth.permissions.accounting;
  const canStudio = isOwner || auth.permissions.studio;

  if (loading) return (<><Topbar back="/v2/clients" title="ลูกค้า" /><LoadingView /></>);
  if (!client) return (<><Topbar back="/v2/clients" title="ไม่พบลูกค้า" /></>);

  const color = (client.colorTag in PALETTE ? client.colorTag : "orange") as ColorStem;

  return (
    <>
      <Topbar back="/v2/clients" title={client.name} />
      <div className="flex-1 space-y-5 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="block h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-full w-full object-contain p-1.5" />
            ) : (
              <span className={cn("flex h-full w-full items-center justify-center text-lg font-bold text-white", PALETTE[color].solid)}>{initials(client.name)}</span>
            )}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-gray-900">{client.name}</h1>
            {client.contactName && <p className="truncate text-xs text-gray-500">{client.contactName}</p>}
          </div>
        </div>

        <AppGrid>
          <FeatureTile href={`/clients/${id}`} label="คอนเทนต์" icon={Clapperboard} color="orange" />
          <FeatureTile href={`/clients/${id}?stage=shoot`} label="การถ่าย" icon={Camera} color="sky" />
          <FeatureTile href={`/v2/clients/${id}/ci`} label="CI Brand" icon={Palette} color="pink" />
          <FeatureTile href={`/clients/${id}/info`} label="ข้อมูลลูกค้า" icon={Info} color="gray" />
          {canStudio && <FeatureTile href={`/clients/${id}/context`} label="บริบท AI" icon={Sparkles} color="violet" />}
          {client.portalEnabled ? (
            <FeatureTile href={clientLinkPath(client)} label="ดูลิงก์ลูกค้า" icon={ExternalLink} color="teal" external />
          ) : (
            <FeatureTile href={`/clients/${id}/info`} label="ดูลิงก์ลูกค้า" icon={ExternalLink} color="gray" note="ลิงก์ถูกยกเลิก" />
          )}
          <FeatureTile href={`/v2/clients/${id}/history`} label="ประวัติการคุย" icon={MessagesSquare} color="amber" />
          {canMoney && <FeatureTile href={`/v2/clients/${id}/money`} label="บัญชี" icon={Wallet} color="emerald" />}
        </AppGrid>
      </div>
    </>
  );
}
