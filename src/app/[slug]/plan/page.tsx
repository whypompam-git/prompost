import { notFound } from "next/navigation";
import { PortalPlanPage } from "@/components/portal/PortalPages";
import { RESERVED_SLUGS } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default function ClientSlugPlan({ params }: { params: { slug: string } }) {
  if (RESERVED_SLUGS.has(params.slug)) notFound();
  return <PortalPlanPage clientKey={params.slug} basePath={`/${params.slug}`} />;
}
