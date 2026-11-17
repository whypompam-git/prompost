import { createAdminClient } from "@/lib/supabase/admin";
import type { Dump } from "@/lib/backupRestore";

// SERVER-ONLY: read one nightly backup from the private "backups" bucket.
export async function loadBackup(file: string): Promise<Dump | null> {
  if (!/^backup-\d{4}-\d{2}-\d{2}\.json$/.test(file)) return null;
  const { data } = await createAdminClient().storage.from("backups").download(file);
  return data ? (JSON.parse(await data.text()) as Dump) : null;
}
