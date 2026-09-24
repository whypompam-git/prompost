import { notFound } from "next/navigation";
import { PortalInfoView } from "@/components/portal/PortalInfoView";
import { RESERVED_SLUGS } from "@/lib/slug";

export default function ClientSlugInfoPage({ params }: { params: { slug: string } }) {
  if (RESERVED_SLUGS.has(params.slug)) notFound();
  return <PortalInfoView clientKey={params.slug} basePath={`/${params.slug}`} />;
}
