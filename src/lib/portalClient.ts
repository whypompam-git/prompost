import { isUuid } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

// A portal link key is either a friendly slug (/gravita) or the legacy
// unguessable token (/portal/<uuid>).
export async function findPortalClient(key: string, columns = "id, name") {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select(`${columns}, portal_enabled`)
    .eq(isUuid(key) ? "portal_token" : "slug", key)
    .maybeSingle();
  return data as (Record<string, any> & { id: string; name: string; portal_enabled: boolean }) | null;
}
