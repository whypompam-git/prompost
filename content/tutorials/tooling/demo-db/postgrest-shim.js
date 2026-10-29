// Minimal PostgREST-compatible server for local demo recordings.
// Supports what src/ uses: select with simple embeds, eq/neq/gt/gte/lt/lte/like/ilike/is/in/cs/not filters,
// order/limit/offset/Range, single/maybeSingle, insert/upsert/update/delete with return=representation, rpc.
const http = require("http");
const { Pool } = require("pg");
const pool = new Pool({ host: "/var/run/postgresql", user: "root", database: "prompost" });
pool.on("error", (e) => console.error("pool", e.message));
const PORT = Number(process.env.PORT || 54321);

let FK = []; // {tbl, cols:[..], ref, refcols:[..]}
let PK = {}; // tbl -> [cols]
async function loadMeta() {
  const fk = await pool.query(`
    select c.conrelid::regclass::text tbl, c.confrelid::regclass::text ref,
      array(select a.attname from unnest(c.conkey) k join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k)::text[] cols,
      array(select a.attname from unnest(c.confkey) k join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k)::text[] refcols
    from pg_constraint c join pg_namespace n on n.oid=c.connamespace where c.contype='f' and n.nspname='public'`);
  FK = fk.rows;
  const pk = await pool.query(`
    select c.conrelid::regclass::text tbl, array(select a.attname from unnest(c.conkey) k join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k)::text[] cols
    from pg_constraint c join pg_namespace n on n.oid=c.connamespace where c.contype='p' and n.nspname='public'`);
  PK = Object.fromEntries(pk.rows.map((r) => [r.tbl, r.cols]));
}

const qi = (s) => '"' + String(s).replace(/"/g, '""') + '"';
function splitTop(s) {
  const out = []; let depth = 0, cur = "", q = false;
  for (const ch of s) {
    if (ch === '"') q = !q;
    if (!q && ch === "(") depth++;
    if (!q && ch === ")") depth--;
    if (!q && ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

let aliasN = 0;
// returns SQL expression list for a select string against alias `t` of table `tbl`
function selectSql(tbl, sel, t) {
  const items = splitTop(sel || "*");
  const parts = [];
  for (let it of items) {
    it = it.replace(/\s+/g, " ").trim();
    const m = it.match(/^(?:([\w]+):)?([\w]+)(?:![\w]+)?\s*\((.*)\)$/s);
    if (m) {
      const alias = m[1] || m[2], rel = m[2], sub = m[3];
      const a = "e" + aliasN++;
      const toOne = FK.find((f) => f.tbl === tbl && f.ref === rel);
      const toMany = FK.find((f) => f.tbl === rel && f.ref === tbl);
      if (toOne) {
        const on = toOne.cols.map((c, i) => `${a}.${qi(toOne.refcols[i])} = ${t}.${qi(c)}`).join(" and ");
        parts.push(`(select row_to_json(x) from (select ${selectSql(rel, sub, a)} from ${qi(rel)} ${a} where ${on}) x) as ${qi(alias)}`);
      } else if (toMany) {
        const on = toMany.cols.map((c, i) => `${a}.${qi(c)} = ${t}.${qi(toMany.refcols[i])}`).join(" and ");
        parts.push(`(select coalesce(json_agg(x), '[]'::json) from (select ${selectSql(rel, sub, a)} from ${qi(rel)} ${a} where ${on}) x) as ${qi(alias)}`);
      } else throw new Error(`no relationship ${tbl} -> ${rel}`);
      continue;
    }
    if (it === "*") { parts.push(`${t}.*`); continue; }
    const c = it.match(/^(?:([\w]+):)?([\w]+)(?:::([\w]+))?$/);
    if (!c) throw new Error("bad select item " + it);
    const expr = `${t}.${qi(c[2])}` + (c[3] ? `::${c[3]}` : "");
    parts.push(`${expr} as ${qi(c[1] || c[2])}`);
  }
  return parts.join(", ");
}

function parseList(v) { // (a,b,"c d")
  const inner = v.replace(/^\(/, "").replace(/\)$/, "");
  return splitTop(inner).map((x) => x.replace(/^"(.*)"$/, "$1"));
}
function filterSql(col, raw, params, t) {
  let neg = false, v = raw;
  if (v.startsWith("not.")) { neg = true; v = v.slice(4); }
  const dot = v.indexOf(".");
  const op = v.slice(0, dot), val = v.slice(dot + 1);
  const c = `${t}.${qi(col)}`;
  const p = (x) => { params.push(x); return "$" + params.length; };
  let s;
  switch (op) {
    case "eq": s = `${c} = ${p(val)}`; break;
    case "neq": s = `${c} <> ${p(val)}`; break;
    case "gt": s = `${c} > ${p(val)}`; break;
    case "gte": s = `${c} >= ${p(val)}`; break;
    case "lt": s = `${c} < ${p(val)}`; break;
    case "lte": s = `${c} <= ${p(val)}`; break;
    case "like": s = `${c}::text like ${p(val.replace(/\*/g, "%"))}`; break;
    case "ilike": s = `${c}::text ilike ${p(val.replace(/\*/g, "%"))}`; break;
    case "is": s = `${c} is ${val === "null" ? "null" : val === "true" ? "true" : val === "false" ? "false" : "unknown"}`; break;
    case "in": s = `${c} = any(${p(parseList(val))})`; break;
    case "cs": s = `${c} @> ${p(val)}`; break;
    case "cd": s = `${c} <@ ${p(val)}`; break;
    case "ov": s = `${c} && ${p(val)}`; break;
    default: throw new Error("unsupported op " + op);
  }
  return neg ? `not (${s})` : s;
}
function orSql(raw, params, t) { // or=(a.eq.1,b.is.null)
  return "(" + parseList(raw).map((cond) => {
    const i = cond.indexOf(".");
    return filterSql(cond.slice(0, i), cond.slice(i + 1), params, t);
  }).join(" or ") + ")";
}

const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);
function whereSql(sp, params, t) {
  const w = [];
  for (const [k, v] of sp) {
    if (RESERVED.has(k)) continue;
    if (k === "or") w.push(orSql(v, params, t));
    else w.push(filterSql(k, v, params, t));
  }
  return w.length ? " where " + w.join(" and ") : "";
}
function orderSql(sp, t) {
  const o = sp.get("order");
  if (!o) return "";
  return " order by " + o.split(",").map((part) => {
    const [col, ...mods] = part.split(".");
    let s = `${t}.${qi(col)}`;
    if (mods.includes("desc")) s += " desc"; else s += " asc";
    if (mods.includes("nullsfirst")) s += " nulls first";
    if (mods.includes("nullslast")) s += " nulls last";
    return s;
  }).join(", ");
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  res.end(body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body));
}

async function handle(req, res) {
  const url = new URL(req.url, "http://x");
  if (url.pathname.startsWith("/storage/v1")) return send(res, 404, { message: "storage not available in demo" });
  const m = url.pathname.match(/^\/rest\/v1\/(rpc\/)?([\w]+)$/);
  if (!m) return send(res, 404, { message: "not found" });
  const isRpc = !!m[1], tbl = m[2];
  const sp = url.searchParams;
  const method = req.method;
  const accept = req.headers["accept"] || "";
  const prefer = req.headers["prefer"] || "";
  const single = accept.includes("vnd.pgrst.object");
  let body = null;
  if (method !== "GET" && method !== "HEAD") {
    const chunks = []; for await (const c of req) chunks.push(c);
    const s = Buffer.concat(chunks).toString();
    body = s ? JSON.parse(s) : null;
  }
  const params = [];
  let sql;
  if (isRpc) {
    const args = Object.entries(body || {});
    sql = `select ${qi(tbl)}(${args.map(([k], i) => `${qi(k)} => $${i + 1}`).join(", ")}) as r`;
    const r = await pool.query(sql, args.map(([, v]) => (v !== null && typeof v === "object" ? JSON.stringify(v) : v)));
    return send(res, 200, r.rows[0].r);
  }
  const sel = sp.get("select");
  const returning = prefer.includes("return=representation");
  if (method === "GET" || method === "HEAD") {
    let lim = sp.get("limit"), off = sp.get("offset");
    const range = req.headers["range"];
    if (range) { const [a, b] = range.split("-").map(Number); off = a; lim = b - a + 1; }
    sql = `select ${selectSql(tbl, sel, "t")} from ${qi(tbl)} t${whereSql(sp, params, "t")}${orderSql(sp, "t")}` +
      (lim ? ` limit ${Number(lim)}` : "") + (off ? ` offset ${Number(off)}` : "");
  } else if (method === "POST") {
    const rows = Array.isArray(body) ? body : [body];
    const cols = sp.get("columns") ? sp.get("columns").split(",") : [...new Set(rows.flatMap((r) => Object.keys(r)))];
    params.push(JSON.stringify(rows));
    let ins = `insert into ${qi(tbl)} (${cols.map(qi).join(", ")}) select ${cols.map(qi).join(", ")} from json_populate_recordset(null::${qi(tbl)}, $1)`;
    if (prefer.includes("resolution=")) {
      const conflict = sp.get("on_conflict") ? sp.get("on_conflict").split(",") : PK[tbl];
      ins += prefer.includes("ignore-duplicates") ? ` on conflict (${conflict.map(qi).join(", ")}) do nothing`
        : ` on conflict (${conflict.map(qi).join(", ")}) do update set ${cols.filter((c) => !conflict.includes(c)).map((c) => `${qi(c)} = excluded.${qi(c)}`).join(", ") || `${qi(conflict[0])} = excluded.${qi(conflict[0])}`}`;
    }
    sql = `with w as (${ins} returning *) select ${selectSql(tbl, sel, "t")} from w t`;
  } else if (method === "PATCH") {
    params.push(JSON.stringify(body));
    const cols = Object.keys(body);
    const where = whereSql(sp, params, qi(tbl));
    const upd = `update ${qi(tbl)} set (${cols.map(qi).join(", ")}) = (select ${cols.map(qi).join(", ")} from json_populate_record(null::${qi(tbl)}, $1))${where}`;
    sql = cols.length === 1
      ? `with w as (update ${qi(tbl)} set ${qi(cols[0])} = (select ${qi(cols[0])} from json_populate_record(null::${qi(tbl)}, $1))${where} returning *) select ${selectSql(tbl, sel, "t")} from w t`
      : `with w as (${upd} returning *) select ${selectSql(tbl, sel, "t")} from w t`;
  } else if (method === "DELETE") {
    sql = `with w as (delete from ${qi(tbl)}${whereSql(sp, params, qi(tbl))} returning *) select ${selectSql(tbl, sel, "t")} from w t`;
  } else return send(res, 405, { message: "method" });

  // data-modifying CTEs must stay at the top level: "with w as (...) select json_agg(...) from (select ... from w t) q"
  const m2 = sql.match(/^with w as \(([\s\S]*)\) select ([\s\S]*) from w t$/);
  const wrapped = m2
    ? `with w as (${m2[1]}) select coalesce(json_agg(q), '[]'::json) as j from (select ${m2[2]} from w t) q`
    : `select coalesce(json_agg(q), '[]'::json) as j from (${sql}) q`;
  const r = await pool.query(wrapped, params);
  const rows = r.rows[0].j;
  const hdr = { "content-range": rows.length ? `0-${rows.length - 1}/*` : "*/0" };
  if (method !== "GET" && method !== "HEAD" && !returning) return send(res, method === "POST" ? 201 : 204, undefined, hdr);
  if (single) {
    if (rows.length !== 1) return send(res, 406, { code: "PGRST116", details: `The result contains ${rows.length} rows`, hint: null, message: "JSON object requested, multiple (or no) rows returned" });
    return send(res, method === "POST" ? 201 : 200, rows[0], hdr);
  }
  return send(res, method === "POST" ? 201 : 200, rows, hdr);
}

loadMeta().then(() => {
  http.createServer((req, res) => handle(req, res).catch((e) => {
    console.error(req.method, req.url, e.message);
    send(res, 400, { code: e.code || "PGRST000", message: e.message, details: e.detail || null, hint: null });
  })).listen(PORT, () => console.log("shim on", PORT));
});
