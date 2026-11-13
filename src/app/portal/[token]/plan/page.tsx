import { PortalPlanPage } from "@/components/portal/PortalPages";

export const dynamic = "force-dynamic";

export default function LegacyPortalPlan({ params }: { params: { token: string } }) {
  return <PortalPlanPage clientKey={params.token} basePath={`/portal/${params.token}`} />;
}
