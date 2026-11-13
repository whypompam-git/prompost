import { PortalFilesPage } from "@/components/portal/PortalPages";

export const dynamic = "force-dynamic";

export default function LegacyPortalFiles({ params }: { params: { token: string } }) {
  return <PortalFilesPage clientKey={params.token} basePath={`/portal/${params.token}`} />;
}
