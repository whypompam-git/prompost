import { notFound } from "next/navigation";
import { PortalContentView } from "@/components/portal/PortalContentView";
import { RESERVED_SLUGS } from "@/lib/slug";

export default function ClientSlugPage({ params }: { params: { slug: string } }) {
  if (RESERVED_SLUGS.has(params.slug)) notFound();
  return <PortalContentView clientKey={params.slug} basePath={`/${params.slug}`} />;
}
