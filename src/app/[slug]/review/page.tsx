import { notFound } from "next/navigation";
import { PortalReviewPage } from "@/components/portal/PortalPages";
import { RESERVED_SLUGS } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default function ClientSlugReview({ params }: { params: { slug: string } }) {
  if (RESERVED_SLUGS.has(params.slug)) notFound();
  return <PortalReviewPage clientKey={params.slug} basePath={`/${params.slug}`} />;
}
