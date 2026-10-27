// Authorization rules for the /api/sb database proxy. Pure and dependency-free
// so it can be unit-tested (tests/proxyRules.test.ts) without a server.
//
// The browser's Supabase client sends every REST/Storage call to /api/sb/*;
// the route checks the login session and then calls Supabase with the
// service-role key. These rules are the only thing standing between a logged-in
// staff member's DevTools and the whole database, so they are deliberately
// conservative: unknown tables and RPCs are refused.

export type ProxyAccess = {
  staffId: string;
  role: "owner" | "staff";
  hideInternal?: boolean; // position that must not see internal data (e.g. edit difficulty)
  ownOnly?: boolean; // locked to /api/my/* — the generic database proxy is closed to them (except their own inbox)
  permissions: { documents: boolean; accounting: boolean; othersPayroll: boolean; mc?: boolean };
};

export type ProxyDecision =
  | { ok: true; search: string; minimalReturn?: boolean }
  | { ok: false; status: number; reason: string };

const deny = (status: number, reason: string): ProxyDecision => ({ ok: false, status, reason });

// Tables the app reads/writes through the browser client.
const TABLES = new Set([
  "agency_settings",
  "client_notes",
  "client_packages",
  "clients",
  "content_sets",
  "contract_template",
  "contracts",
  "doc_counters", // read-only: numbers are issued through the next_doc_no rpc
  "invoices",
  "leave_requests",
  "line_channels",
  "mc_packs",
  "mc_profiles",
  "mc_settings",
  "notifications",
  "packages",
  "payroll_entries",
  "positions",
  "queues",
  "quotations",
  "receipts",
  "staff",
  "task_revisions",
  "task_settings",
  "tasks",
  "teams",
  "transactions",
]);

// Money documents: anyone logged in may read (the clients table shows paid /
// outstanding to everyone), but writing needs the documents or accounting
// permission.
const FINANCIAL_TABLES = new Set([
  "agency_settings",
  "contract_template",
  "contracts",
  "invoices",
  "quotations",
  "receipts",
  "transactions",
]);

const SELF_EDITABLE_STAFF_COLUMNS = new Set(["name", "photo_url", "bank_name", "bank_account_no", "bank_account_name"]);
const RPCS = new Set(["next_doc_no"]);

function bodyRows(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body.filter((r): r is Record<string, unknown> => !!r && typeof r === "object");
  return body && typeof body === "object" ? [body as Record<string, unknown>] : [];
}

export function authorizeProxyRequest(input: {
  method: string;
  path: string; // e.g. "rest/v1/clients" or "storage/v1/object/slips/abc.png"
  search: string; // leading "?" or ""
  body: unknown; // parsed JSON body when there is one
  access: ProxyAccess;
}): ProxyDecision {
  const method = input.method.toUpperCase();
  const { access } = input;
  const isOwner = access.role === "owner";
  const canWriteFinance = isOwner || access.permissions.documents || access.permissions.accounting;
  const parts = input.path.split("/").filter(Boolean);
  const write = method !== "GET" && method !== "HEAD";

  // ── Storage is never proxied: uploads use signed URLs from /api/storage/sign
  if (parts[0] === "storage") return deny(403, "storage is not available through the proxy");

  if (parts[0] !== "rest" || parts[1] !== "v1" || !parts[2]) return deny(404, "unknown path");

  // ── RPC ────────────────────────────────────────────────────────────────
  if (parts[2] === "rpc") {
    const fn = parts[3] ?? "";
    if (!RPCS.has(fn) || method !== "POST") return deny(403, "rpc not allowed");
    return canWriteFinance ? { ok: true, search: input.search } : deny(403, "needs documents/accounting permission");
  }

  const table = parts[2];
  if (!TABLES.has(table)) return deny(403, `table "${table}" not allowed`);
  if (access.ownOnly && table !== "notifications") return deny(403, "this account only has access to its own work (/my-work)");

  let search = input.search;
  const params = new URLSearchParams(search);

  // pin hashes never leave the database (login verifies them server-side)
  if (table === "staff" && /pin_hash/i.test(search) && !isOwner) return deny(403, "pin_hash is not readable");
  if (table === "staff" && method === "GET" && /pin_hash/i.test(search)) return deny(403, "pin_hash is not readable");

  if (table === "staff" && write && !isOwner) {
    if (method !== "PATCH") return deny(403, "owner only");
    if (params.get("id") !== `eq.${access.staffId}`) return deny(403, "you can only edit your own profile");
    for (const row of bodyRows(input.body)) {
      for (const key of Object.keys(row)) {
        if (!SELF_EDITABLE_STAFF_COLUMNS.has(key)) return deny(403, `column "${key}" is owner-only`);
      }
    }
  }

  if (table === "payroll_entries" && !isOwner && !access.permissions.othersPayroll) {
    if (!write) {
      // read-your-own-only: pin the query to the caller's rows
      params.set("staff_id", `eq.${access.staffId}`);
      search = `?${params.toString()}`;
    } else if (method === "POST") {
      for (const row of bodyRows(input.body)) {
        if (row.staff_id !== access.staffId) return deny(403, "payroll rows are owner-only");
      }
    } else {
      return deny(403, "payroll is owner-only");
    }
  }

  if (table === "leave_requests" && write) {
    if (method === "POST") {
      if (!isOwner) {
        for (const row of bodyRows(input.body)) {
          if (row.staff_id !== access.staffId) return deny(403, "you can only file your own leave");
        }
      }
    } else if (!isOwner) {
      return deny(403, "owner only");
    }
  }

  // MC data (phone / Line / real names): owner or the MC permission only
  if ((table === "mc_profiles" || table === "mc_packs" || table === "mc_settings") && !isOwner && !access.permissions.mc) {
    return deny(403, "needs the MC permission");
  }
  // sheet-owned columns are written only by the sync; people edit our own fields
  if (table === "mc_profiles" && write) {
    if (method !== "PATCH") return deny(403, "profiles come from the sheet sync");
    const LOCAL = new Set(["rate_offer", "notes", "hidden", "extra_photos"]);
    for (const row of bodyRows(input.body)) for (const k of Object.keys(row)) if (!LOCAL.has(k)) return deny(403, `column "${k}" comes from the sheet`);
  }
  if (table === "mc_settings" && write && !isOwner) return deny(403, "owner only");
  if ((table === "positions") && write && !isOwner) return deny(403, "owner only");

  // Internal-only data: people in a "hide internal" position never get the
  // edit_difficulty column — not in reads, not in what a write returns, not as a filter.
  let minimalReturn = false;
  if (access.hideInternal && table !== "tasks" && (/edit_difficulty/i.test(search) || /\btasks\s*(![\w]+)?\s*\(/i.test(params.get("select") ?? ""))) {
    return deny(403, "embedding tasks is not available for this position");
  }
  if (table === "tasks" && access.hideInternal) {
    if (/edit_difficulty/i.test(params.get("order") ?? "") || [...params.entries()].some(([k, v]) => k !== "select" && /edit_difficulty/i.test(`${k}=${v}`))) {
      return deny(403, "edit_difficulty is not available");
    }
    if (write) {
      for (const row of bodyRows(input.body)) if ("edit_difficulty" in row) return deny(403, "edit_difficulty is not editable for this position");
    }
    const select = params.get("select");
    if (select === null || select.trim() === "" || select.includes("*")) {
      if (!write) return deny(403, "list the columns you need (select=…)");
    } else {
      const cols = select.split(",").map((c) => c.trim()).filter((c) => c && !/^edit_difficulty$/i.test(c));
      params.set("select", cols.join(","));
      search = `?${params.toString()}`;
    }
    if (write && (select === null || select.includes("*"))) minimalReturn = true;
  }

  if ((table === "task_settings" || table === "teams") && write && !isOwner) return deny(403, "owner only");
  // revision history is written by the server routes only
  if (table === "task_revisions" && write) return deny(403, "written by the server only");

  // everyone sees (and marks read) only their own inbox; rows are created server-side
  if (table === "notifications") {
    if (method === "GET" || method === "HEAD") {
      params.set("recipient_id", `eq.${access.staffId}`);
      search = `?${params.toString()}`;
    } else if (method === "PATCH") {
      params.set("recipient_id", `eq.${access.staffId}`);
      search = `?${params.toString()}`;
      for (const row of bodyRows(input.body)) {
        for (const key of Object.keys(row)) if (key !== "read_at") return deny(403, `column "${key}" is not editable`);
      }
    } else {
      return deny(403, "notifications are created by the server");
    }
  }

  if (table === "line_channels" && !isOwner) return deny(403, "owner only");
  if (table === "doc_counters" && write) return deny(403, "use the next_doc_no rpc");

  if (FINANCIAL_TABLES.has(table) && write && !canWriteFinance) {
    return deny(403, "needs documents/accounting permission");
  }

  return minimalReturn ? { ok: true, search, minimalReturn } : { ok: true, search };
}
