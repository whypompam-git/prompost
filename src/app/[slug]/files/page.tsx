import { notFound } from "next/navigation";
import { PortalFilesPage } from "@/components/portal/PortalPages";
import { RESERVED_SLUGS } from "@/lib/slug";

export const dynamic = "force-dynamic";

export default function ClientSlugFiles({ params }: { params: { slug: string } }) {
  if (RESERVED_SLUGS.has(params.slug)) notFound();
  return <PortalFilesPage clientKey={params.slug} basePath={`/${params.slug}`} />;
}
