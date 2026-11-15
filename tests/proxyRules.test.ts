import assert from "node:assert/strict";
import { test } from "node:test";
import { authorizeProxyRequest, type ProxyAccess } from "../src/lib/supabase/proxyRules.ts";

const owner: ProxyAccess = {
  staffId: "owner-1",
  role: "owner",
  workspaceId: "ws-a",
  permissions: { documents: true, accounting: true, othersPayroll: true },
};
const staff: ProxyAccess = {
  staffId: "staff-1",
  role: "staff",
  workspaceId: "ws-a",
  permissions: { documents: false, accounting: false, othersPayroll: false },
};
const finance: ProxyAccess = { ...staff, permissions: { ...staff.permissions, documents: true } };

const run = (access: ProxyAccess, method: string, path: string, search = "", body: unknown = undefined) =>
  authorizeProxyRequest({ method, path, search, body, access });

test("unknown tables, paths and rpcs are refused", () => {
  assert.equal(run(owner, "GET", "rest/v1/app_migrations").ok, false);
  assert.equal(run(owner, "POST", "rest/v1/doc_counters", "", [{ last_no: 1 }]).ok, false);
  assert.equal(run(owner, "POST", "rest/v1/rpc/drop_everything").ok, false);
  assert.equal(run(owner, "GET", "auth/v1/user").ok, false);
});

test("ordinary tables are open to logged-in staff", () => {
  assert.equal(run(staff, "GET", "rest/v1/clients", "?select=*").ok, true);
  assert.equal(run(staff, "PATCH", "rest/v1/clients", "?id=eq.x", { phone: "1" }).ok, true);
  assert.equal(run(staff, "POST", "rest/v1/tasks", "", [{ title: "t" }]).ok, true);
});

test("pin_hash is unreadable and unwritable for everyone (logins live in accounts now)", () => {
  assert.equal(run(staff, "GET", "rest/v1/staff", "?select=id,pin_hash").ok, false);
  assert.equal(run(owner, "GET", "rest/v1/staff", "?select=id,pin_hash").ok, false);
  assert.equal(run(owner, "POST", "rest/v1/staff", "", [{ name: "n", pin_hash: "h" }]).ok, false);
  assert.equal(run(owner, "POST", "rest/v1/staff", "", [{ name: "n" }]).ok, true);
});

test("staff may only edit their own profile fields", () => {
  assert.equal(run(staff, "PATCH", "rest/v1/staff", "?id=eq.staff-1", { name: "x", bank_name: "y" }).ok, true);
  assert.equal(run(staff, "PATCH", "rest/v1/staff", "?id=eq.owner-1", { name: "x" }).ok, false);
  assert.equal(run(staff, "PATCH", "rest/v1/staff", "?id=eq.staff-1", { role: "owner" }).ok, false);
  assert.equal(run(staff, "PATCH", "rest/v1/staff", "?id=eq.staff-1", { permissions: {} }).ok, false);
  assert.equal(run(staff, "POST", "rest/v1/staff", "", [{ name: "n" }]).ok, false);
  assert.equal(run(staff, "DELETE", "rest/v1/staff", "?id=eq.staff-1").ok, false);
});

test("payroll: others' rows are hidden, own row pinned", () => {
  const read = run(staff, "GET", "rest/v1/payroll_entries", "?select=*&period_month=eq.2026-10-01");
  assert.equal(read.ok, true);
  if (read.ok) assert.match(read.search, /staff_id=eq\.staff-1/);
  assert.equal(run(staff, "POST", "rest/v1/payroll_entries", "", [{ staff_id: "staff-1" }]).ok, true);
  assert.equal(run(staff, "POST", "rest/v1/payroll_entries", "", [{ staff_id: "owner-1" }]).ok, false);
  assert.equal(run(staff, "PATCH", "rest/v1/payroll_entries", "?id=eq.p", { bonus: 9999 }).ok, false);
  const ownerRead = run(owner, "GET", "rest/v1/payroll_entries", "?select=*");
  assert.equal(ownerRead.ok && ownerRead.search === "?select=*&workspace_id=eq.ws-a", true);
});

test("a client cannot spoof the staff_id filter to read others' payroll", () => {
  const read = run(staff, "GET", "rest/v1/payroll_entries", "?staff_id=eq.owner-1");
  assert.equal(read.ok, true);
  if (read.ok) assert.equal(new URLSearchParams(read.search).get("staff_id"), "eq.staff-1");
});

test("leave: staff file their own, only the owner decides", () => {
  assert.equal(run(staff, "POST", "rest/v1/leave_requests", "", [{ staff_id: "staff-1" }]).ok, true);
  assert.equal(run(staff, "POST", "rest/v1/leave_requests", "", [{ staff_id: "owner-1" }]).ok, false);
  assert.equal(run(staff, "PATCH", "rest/v1/leave_requests", "?id=eq.l", { status: "approved" }).ok, false);
  assert.equal(run(owner, "PATCH", "rest/v1/leave_requests", "?id=eq.l", { status: "approved" }).ok, true);
});

test("financial tables: read for all, write needs a permission", () => {
  for (const t of ["transactions", "receipts", "quotations", "invoices", "agency_settings", "contracts", "contract_template"]) {
    assert.equal(run(staff, "GET", `rest/v1/${t}`, "?select=*").ok, true, `${t} read`);
    assert.equal(run(staff, "POST", `rest/v1/${t}`, "", [{}]).ok, false, `${t} write`);
    assert.equal(run(finance, "POST", `rest/v1/${t}`, "", [{}]).ok, true, `${t} write w/ permission`);
  }
  assert.equal(run(staff, "POST", "rest/v1/rpc/next_doc_no", "", {}).ok, false);
  assert.equal(run(finance, "POST", "rest/v1/rpc/next_doc_no", "", {}).ok, true);
});

test("teams: anyone reads, only the owner writes", () => {
  assert.equal(run(staff, "GET", "rest/v1/teams", "?select=*").ok, true);
  assert.equal(run(staff, "POST", "rest/v1/teams", "", [{ name: "x" }]).ok, false);
  assert.equal(run(owner, "POST", "rest/v1/teams", "", [{ name: "x" }]).ok, true);
  assert.equal(run(staff, "PATCH", "rest/v1/staff", "?id=eq.staff-1", { team_id: "t" }).ok, false);
});

test("task_settings write is owner-only", () => {
  assert.equal(run(staff, "POST", "rest/v1/task_settings", "", {}).ok, false);
  assert.equal(run(owner, "POST", "rest/v1/task_settings", "", {}).ok, true);
});

test("storage is never available through the proxy", () => {
  assert.equal(run(owner, "POST", "storage/v1/object/slips/a.png").ok, false);
  assert.equal(run(owner, "DELETE", "storage/v1/object/slips/a.png").ok, false);
  assert.equal(run(owner, "GET", "storage/v1/object/list/backups").ok, false);
});

test("notifications: own inbox only, mark-read only, no creating from the browser", () => {
  const r = run(staff, "GET", "rest/v1/notifications", "?select=*&recipient_id=eq.someone-else");
  assert.equal(r.ok && r.search.includes("recipient_id=eq.staff-1"), true);
  assert.equal(r.ok && r.search.includes("someone-else"), false);
  assert.equal(run(staff, "POST", "rest/v1/notifications", "", [{ title: "x" }]).ok, false);
  assert.equal(run(staff, "DELETE", "rest/v1/notifications", "?id=eq.1").ok, false);
  assert.equal(run(staff, "PATCH", "rest/v1/notifications", "?id=eq.1", { read_at: "2026-01-01" }).ok, true);
  assert.equal(run(staff, "PATCH", "rest/v1/notifications", "?id=eq.1", { title: "hacked" }).ok, false);
});

test("task_revisions are read-only from the browser", () => {
  assert.equal(run(staff, "GET", "rest/v1/task_revisions", "?task_id=eq.1").ok, true);
  assert.equal(run(owner, "POST", "rest/v1/task_revisions", "", [{ brief: "x" }]).ok, false);
});

test("line_channels (group IDs) are owner-only, even to read", () => {
  assert.equal(run(staff, "GET", "rest/v1/line_channels", "?select=*").ok, false);
  assert.equal(run(owner, "GET", "rest/v1/line_channels", "?select=*").ok, true);
  assert.equal(run(owner, "POST", "rest/v1/line_channels", "", [{ name: "x" }]).ok, true);
});

const hidden: ProxyAccess = { ...staff, hideInternal: true };

test("hide-internal positions never get edit_difficulty", () => {
  const sel = (r: ReturnType<typeof run>) => (r.ok ? new URLSearchParams(r.search).get("select") : "DENIED");
  assert.equal(sel(run(hidden, "GET", "rest/v1/tasks", "?select=id,title,edit_difficulty,editor_id")), "id,title,editor_id");
  assert.equal(sel(run(hidden, "GET", "rest/v1/tasks", "?select=*")), "DENIED");
  assert.equal(sel(run(hidden, "GET", "rest/v1/tasks", "")), "DENIED");
  assert.equal(run(hidden, "GET", "rest/v1/tasks", "?select=id&edit_difficulty=gte.4").ok, false);
  assert.equal(run(hidden, "GET", "rest/v1/tasks", "?select=id&order=edit_difficulty.desc").ok, false);
  assert.equal(run(hidden, "PATCH", "rest/v1/tasks", "?id=eq.x", { edit_difficulty: 1 }).ok, false);
  assert.equal(run(hidden, "GET", "rest/v1/clients", "?select=name,tasks(edit_difficulty)").ok, false);
  assert.equal(run(hidden, "GET", "rest/v1/clients", "?select=id,tasks(id)").ok, false);
  // ordinary use still works; a write with no select is forced to return nothing
  assert.equal(run(hidden, "GET", "rest/v1/clients", "?select=id,name").ok, true);
  const w = run(hidden, "PATCH", "rest/v1/tasks", "?id=eq.x", { title: "t" });
  assert.equal(w.ok && w.minimalReturn, true);
  // everyone else is unaffected
  assert.equal(sel(run(staff, "GET", "rest/v1/tasks", "?select=id,edit_difficulty")), "id,edit_difficulty");
  assert.equal(run(staff, "PATCH", "rest/v1/tasks", "?id=eq.x", { edit_difficulty: 3 }).ok, true);
});

test("positions: readable by all, editable by the owner only", () => {
  assert.equal(run(staff, "GET", "rest/v1/positions", "?select=*").ok, true);
  assert.equal(run(staff, "POST", "rest/v1/positions", "", [{ name: "x" }]).ok, false);
  assert.equal(run(owner, "POST", "rest/v1/positions", "", [{ name: "x" }]).ok, true);
});

test("MC tables need the MC permission; profiles accept edits to our own columns only", () => {
  const mcStaff: ProxyAccess = { ...staff, permissions: { ...staff.permissions, mc: true } };
  assert.equal(run(staff, "GET", "rest/v1/mc_profiles", "?select=*").ok, false);
  assert.equal(run(staff, "GET", "rest/v1/mc_packs", "?select=*").ok, false);
  assert.equal(run(mcStaff, "GET", "rest/v1/mc_profiles", "?select=*").ok, true);
  assert.equal(run(mcStaff, "PATCH", "rest/v1/mc_profiles", "?id=eq.1", { rate_offer: 3000, notes: "x" }).ok, true);
  assert.equal(run(mcStaff, "PATCH", "rest/v1/mc_profiles", "?id=eq.1", { phone: "000" }).ok, false);
  assert.equal(run(mcStaff, "POST", "rest/v1/mc_profiles", "", [{ nickname: "x" }]).ok, false);
  assert.equal(run(mcStaff, "DELETE", "rest/v1/mc_profiles", "?id=eq.1").ok, false);
  assert.equal(run(mcStaff, "POST", "rest/v1/mc_packs", "", [{ title: "x" }]).ok, true);
  assert.equal(run(mcStaff, "PATCH", "rest/v1/mc_settings", "?id=eq.true", { sheet_url: "x" }).ok, false);
  assert.equal(run(owner, "PATCH", "rest/v1/mc_settings", "?id=eq.true", { sheet_url: "x" }).ok, true);
});

test("own-work-only accounts can reach nothing in the database proxy except their own inbox", () => {
  const mine: ProxyAccess = { ...staff, ownOnly: true };
  for (const t of ["tasks", "clients", "staff", "queues", "client_notes", "payroll_entries", "transactions", "positions", "task_revisions"]) {
    assert.equal(run(mine, "GET", `rest/v1/${t}`, "?select=*").ok, false, t);
  }
  assert.equal(run(mine, "PATCH", "rest/v1/tasks", "?id=eq.x", { status: "done" }).ok, false);
  assert.equal(run(mine, "POST", "rest/v1/rpc/next_doc_no").ok, false);
  const inbox = run(mine, "GET", "rest/v1/notifications", "?select=*&recipient_id=eq.other");
  assert.equal(inbox.ok && inbox.search.includes("recipient_id=eq.staff-1"), true);
  assert.equal(run(mine, "PATCH", "rest/v1/notifications", "?id=eq.1", { read_at: "2026-01-01" }).ok, true);
  assert.equal(run(mine, "POST", "rest/v1/notifications", "", [{ title: "x" }]).ok, false);
});

test("staff contracts, signer info and payment vouchers are owner-only", () => {
  const read = run(staff, "GET", "rest/v1/contracts", "?select=*");
  assert.ok(read.ok && read.search.includes("kind=eq.client"));
  const patch = run(finance, "PATCH", "rest/v1/contracts", "?id=eq.x");
  assert.ok(patch.ok && patch.search.includes("kind=eq.client"));
  assert.equal(run(staff, "POST", "rest/v1/contracts", "", { kind: "monthly" }).ok, false);
  const ownerRead = run(owner, "GET", "rest/v1/contracts", "?select=*");
  assert.ok(ownerRead.ok && !ownerRead.search.includes("kind="));
  for (const t of ["contract_signer_info", "contract_payments", "contract_templates"]) assert.equal(run(staff, "GET", `rest/v1/${t}`, "?select=*").ok, false);
  assert.equal(run(owner, "GET", "rest/v1/contract_signer_info", "?select=*").ok, true);
  assert.equal(run(owner, "POST", "rest/v1/contract_signer_info", "", { contract_id: "x" }).ok, false);
});

test("notes: everyone reads, writes are pinned to the author (owner edits any)", () => {
  assert.equal(run(staff, "GET", "rest/v1/notes", "?select=*").ok, true);
  assert.equal(run(staff, "POST", "rest/v1/notes", "", { author_id: "someone-else", body: "x" }).ok, false);
  assert.equal(run(staff, "POST", "rest/v1/notes", "", { author_id: "staff-1", body: "x" }).ok, true);
  const patch = run(staff, "PATCH", "rest/v1/notes", "?id=eq.n1", { body: "y" });
  assert.ok(patch.ok && patch.search.includes("author_id=eq.staff-1"));
  const ownerPatch = run(owner, "PATCH", "rest/v1/notes", "?id=eq.n1", { body: "y" });
  assert.ok(ownerPatch.ok && !ownerPatch.search.includes("author_id"));
  assert.equal(run(staff, "PATCH", "rest/v1/client_ci", "?client_id=eq.c1", { notes: "x" }).ok, true);
});

test("login fields on staff can't be read or written through the proxy, even by the owner", () => {
  const read = authorizeProxyRequest({ method: "GET", path: "rest/v1/staff", search: "?select=id,pin_hash", access: owner });
  assert.equal(read.ok, false);
  const link = authorizeProxyRequest({ method: "GET", path: "rest/v1/staff", search: "?select=id,account_id", access: owner });
  assert.equal(link.ok, false);
  const write = authorizeProxyRequest({ method: "PATCH", path: "rest/v1/staff", search: "?id=eq.s1", body: { pin_hash: "x" }, access: owner });
  assert.equal(write.ok, false);
  const relink = authorizeProxyRequest({ method: "PATCH", path: "rest/v1/staff", search: "?id=eq.s1", body: { account_id: "a" }, access: owner });
  assert.equal(relink.ok, false);
  const fine = authorizeProxyRequest({ method: "PATCH", path: "rest/v1/staff", search: "?id=eq.s1", body: { name: "x" }, access: owner });
  assert.equal(fine.ok, true);
});

test("the accounts table is not reachable through the proxy", () => {
  assert.equal(authorizeProxyRequest({ method: "GET", path: "rest/v1/accounts", search: "?select=*", access: owner }).ok, false);
});

// ── workspace isolation ─────────────────────────────────────────────────────
const TABLES_TO_CHECK = ["clients", "tasks", "staff", "quotations", "receipts", "invoices", "contracts", "transactions", "packages", "notes", "teams", "positions", "agency_settings", "task_settings"];

test("every read, update and delete is pinned to the caller's workspace", () => {
  for (const t of TABLES_TO_CHECK) {
    for (const method of ["GET", "PATCH", "DELETE"]) {
      const r = run(owner, method, `rest/v1/${t}`, "?select=id&id=eq.x", method === "PATCH" ? { name: "n" } : undefined);
      assert.equal(r.ok, true, `${method} ${t}`);
      if (r.ok) {
        const p = new URLSearchParams(r.search);
        assert.deepEqual(p.getAll("workspace_id"), ["eq.ws-a"], `${method} ${t}`);
      }
    }
  }
});

test("a workspace filter sent by the browser is replaced, not added to", () => {
  for (const spoof of ["?workspace_id=eq.ws-b", "?workspace_id=neq.ws-a", "?select=*&workspace_id=in.(ws-a,ws-b)", "?or=(workspace_id.eq.ws-b)"]) {
    const r = run(owner, "GET", "rest/v1/clients", spoof);
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(new URLSearchParams(r.search).getAll("workspace_id"), ["eq.ws-a"], spoof);
  }
});

test("new rows are stamped with the caller's workspace, whatever the browser sent", () => {
  const one = run(staff, "POST", "rest/v1/tasks", "", { title: "t", workspace_id: "ws-b" });
  assert.equal(one.ok, true);
  if (one.ok) assert.deepEqual(one.body, { title: "t", workspace_id: "ws-a" });
  const many = run(owner, "POST", "rest/v1/clients", "", [{ name: "a" }, { name: "b", workspace_id: "ws-b" }]);
  assert.equal(many.ok, true);
  if (many.ok) assert.deepEqual(many.body, [{ name: "a", workspace_id: "ws-a" }, { name: "b", workspace_id: "ws-a" }]);
  assert.equal(run(owner, "POST", "rest/v1/clients", "", undefined).ok, false);
});

test("rows can't be moved to another workspace", () => {
  assert.equal(run(owner, "PATCH", "rest/v1/clients", "?id=eq.x", { workspace_id: "ws-b" }).ok, false);
  assert.equal(run(owner, "PATCH", "rest/v1/clients", "?id=eq.x", { workspace_id: "ws-a", name: "n" }).ok, true);
});

test("document numbers count inside the caller's workspace", () => {
  const r = run(finance, "POST", "rest/v1/rpc/next_doc_no", "", { p_kind: "quotations", p_prefix: "QT", p_workspace: "ws-b" });
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.body, { p_kind: "quotations", p_prefix: "QT", p_workspace: "ws-a" });
});

test("no workspace, no access", () => {
  const lost = { ...owner, workspaceId: "" };
  assert.equal(authorizeProxyRequest({ method: "GET", path: "rest/v1/clients", search: "", body: undefined, access: lost }).ok, false);
});
