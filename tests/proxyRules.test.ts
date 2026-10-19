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
