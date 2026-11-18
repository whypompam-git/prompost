import { notFound } from "next/navigation";
import { PortalContentView } from "@/components/portal/PortalContentView";
import { RESERVED_SLUGS } from "@/lib/slug";

export const dynamic = "force-dynamic";

// "ข้อมูล" tab: progress, next shoot and every clip.
export default function ClientSlugAll({ params }: { params: { slug: string } }) {
  if (RESERVED_SLUGS.has(params.slug)) notFound();
  return <PortalContentView clientKey={params.slug} basePath={`/${params.slug}`} />;
}
