import { PortalInfoView } from "@/components/portal/PortalInfoView";

export default function LegacyPortalInfoPage({ params }: { params: { token: string } }) {
  return <PortalInfoView clientKey={params.token} basePath={`/portal/${params.token}`} />;
}
