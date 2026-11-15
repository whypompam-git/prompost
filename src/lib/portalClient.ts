import { isUuid } from "@/lib/slug";
import { createAdminClient as createClient } from "@/lib/supabase/admin";

// A portal link key is either a friendly slug (/gravita) or the legacy
// unguessable token (/portal/<uuid>).
export async function findPortalClient(key: string, columns = "id, name") {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select(`${columns}, portal_enabled, workspace_id`)
    .eq(isUuid(key) ? "portal_token" : "slug", key)
    .maybeSingle();
  return data as (Record<string, any> & { id: string; name: string; portal_enabled: boolean; workspace_id: string }) | null;
}
