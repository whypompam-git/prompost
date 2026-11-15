import { createAdminClient } from "./admin";

// SERVER-ONLY. The service-role client limited to one workspace: every select, update and
// delete gets `workspace_id = <ws>` added, and every inserted / upserted row is stamped with
// it. Server routes use this instead of createAdminClient() so a forgotten filter can't show
// or change another workspace's data. (The database also refuses cross-workspace children
// and never lets a row change workspace — see migration 0053.)
//
// Tables without workspace_id (accounts, workspaces) must use createAdminClient() directly.

export const PROMPOST_WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";

type Row = Record<string, unknown>;
type Admin = ReturnType<typeof createAdminClient>;
type Query = ReturnType<Admin["from"]>;
type Count = { count?: "exact" | "planned" | "estimated" };

function stamp<T>(rows: T, ws: string): T {
  const one = (r: unknown) => (r && typeof r === "object" ? { ...(r as Row), workspace_id: ws } : r);
  return (Array.isArray(rows) ? rows.map(one) : one(rows)) as T;
}

export function workspaceDb(workspaceId: string) {
  if (!workspaceId) throw new Error("workspaceDb needs a workspace id");
  const admin = createAdminClient();
  return {
    workspaceId,
    storage: admin.storage,
    rpc: admin.rpc.bind(admin),
    from(table: string) {
      const q: Query = admin.from(table);
      return {
        // columns typed as "*" so rows come back as loose records (no schema types here)
        select: (columns = "*", options?: Count & { head?: boolean }) => q.select(columns as "*", options).eq("workspace_id", workspaceId),
        update: (values: Row, options?: Count) => q.update(stamp(values, workspaceId), options).eq("workspace_id", workspaceId),
        delete: (options?: Count) => q.delete(options).eq("workspace_id", workspaceId),
        insert: (rows: Row | Row[], options?: Count & { defaultToNull?: boolean }) => q.insert(stamp(rows, workspaceId), options),
        upsert: (rows: Row | Row[], options?: Count & { onConflict?: string; ignoreDuplicates?: boolean; defaultToNull?: boolean }) => q.upsert(stamp(rows, workspaceId), options),
      };
    },
  };
}

export type WorkspaceDb = ReturnType<typeof workspaceDb>;
