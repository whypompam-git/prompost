import { notFound, redirect } from "next/navigation";
import { RESERVED_SLUGS } from "@/lib/slug";

// The client link opens on the review feed (ตรวจงาน).
export default function ClientSlugPage({ params }: { params: { slug: string } }) {
  if (RESERVED_SLUGS.has(params.slug)) notFound();
  redirect(`/${params.slug}/review`);
}
