import assert from "node:assert/strict";
import { test } from "node:test";
import { authorizeProxyRequest, type ProxyAccess } from "../src/lib/supabase/proxyRules.ts";

const owner: ProxyAccess = {
  staffId: "owner-1",
  role: "owner",
  permissions: { documents: true, accounting: true, othersPayroll: true },
};
const staff: ProxyAccess = {
  staffId: "staff-1",
  role: "staff",
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

test("pin_hash is unreadable for everyone, writable only by the owner", () => {
  assert.equal(run(staff, "GET", "rest/v1/staff", "?select=id,pin_hash").ok, false);
  assert.equal(run(owner, "GET", "rest/v1/staff", "?select=id,pin_hash").ok, false);
  assert.equal(run(owner, "POST", "rest/v1/staff", "", [{ name: "n", pin_hash: "h" }]).ok, true);
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
  assert.equal(ownerRead.ok && ownerRead.search === "?select=*", true);
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
