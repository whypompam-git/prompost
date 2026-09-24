import { PortalContentView } from "@/components/portal/PortalContentView";

export default function LegacyPortalPage({ params }: { params: { token: string } }) {
  return <PortalContentView clientKey={params.token} basePath={`/portal/${params.token}`} />;
}
