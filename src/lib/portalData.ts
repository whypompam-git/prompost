import { createAdminClient } from "@/lib/supabase/admin";
import { findPortalClient } from "@/lib/portalClient";

// Shared loading for the client-link pages: the client, its logo and what needs
// the client's attention (for the tab badges).
export async function loadPortalClient(clientKey: string) {
  const client = await findPortalClient(clientKey, "id, name, color_tag, brand_images");
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
  return { client, logo, badges };
}
