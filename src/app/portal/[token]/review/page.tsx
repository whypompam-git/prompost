import { PortalReviewPage } from "@/components/portal/PortalPages";

export const dynamic = "force-dynamic";

export default function LegacyPortalReview({ params }: { params: { token: string } }) {
  return <PortalReviewPage clientKey={params.token} basePath={`/portal/${params.token}`} />;
}
