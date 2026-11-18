import { createAdminClient } from "@/lib/supabase/admin";
import { findPortalClient } from "@/lib/portalClient";

// Shared loading for the client-link pages: the client, its logo and what needs
// the client's attention (for the tab badges).
export async function loadPortalClient(clientKey: string) {
  const client = await findPortalClient(clientKey, "id, name, color_tag, brand_images, parent_id, slug, portal_token");
  if (!client) return null;
  const db = createAdminClient();
  const [{ data: ci }, { data: counts }] = await Promise.all([
    db.from("client_ci").select("logo_url").eq("client_id", client.id).maybeSingle(),
    db.from("tasks").select("type").eq("client_id", client.id).in("type", ["plan", "pending"]),
  ]);
  const logo = (ci?.logo_url as string | null) || (client.brand_images as string[] | null)?.[0] || "";
  const badges = {
    review: (counts ?? []).filter((t) => t.type === "pending").length,
    plan: (counts ?? []).filter((t) => t.type === "plan").length,
  };
  // other businesses of the same customer: the link shows a switcher between them
  const rootId = (client.parent_id as string | null) ?? client.id;
  const { data: family } = await db.from("clients").select("id, name, slug, portal_token, parent_id, portal_enabled").or(`id.eq.${rootId},parent_id.eq.${rootId}`).order("name");
  const brands = (family ?? []).length > 1
    ? (family ?? []).filter((c) => c.portal_enabled).map((c) => ({ id: c.id as string, name: c.name as string, path: c.slug ? `/${c.slug}` : `/portal/${c.portal_token}`, current: c.id === client.id }))
    : [];
  return { client, logo, badges, brands };
}
