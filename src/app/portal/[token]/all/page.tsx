import { PortalContentView } from "@/components/portal/PortalContentView";

export const dynamic = "force-dynamic";

export default function LegacyPortalAll({ params }: { params: { token: string } }) {
  return <PortalContentView clientKey={params.token} basePath={`/portal/${params.token}`} />;
}
