// Weekly data backup: dumps every table (data only) to one JSON file and
// stores it in a PRIVATE Supabase Storage bucket ("backups"). Never commit or
// upload backups to GitHub: the repo is public and they contain personal
// data (staff PIN hashes, client details, finances).
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (service role).
// Uploaded files (slips, logos, signatures) stay in their own storage
// buckets and are not copied by this script.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const KEEP = 8;
const BUCKET = "backups";
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY");

const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function api(path, init = {}) {
  const res = await fetch(`${url}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  return res;
}

// PostgREST's root document lists every exposed table.
const spec = await (await api("/rest/v1/")).json();
const tables = Object.keys(spec.definitions ?? spec.components?.schemas ?? {}).sort();
if (tables.length === 0) throw new Error("Could not discover any tables");

const dump = { takenAt: new Date().toISOString(), tables: {} };
for (const table of tables) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await api(`/rest/v1/${encodeURIComponent(table)}?select=*`, {
      headers: { Range: `${from}-${from + 999}`, "Range-Unit": "items" },
    });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  dump.tables[table] = rows;
  console.log(`${table}: ${rows.length} rows`);
}

// make sure the bucket exists and is private
const create = await api("/storage/v1/bucket", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
});
if (!create.ok && create.status !== 400 && create.status !== 409) {
  throw new Error(`bucket: ${create.status} ${await create.text()}`);
}

const name = `backup-${dump.takenAt.slice(0, 10)}.json`;
const up = await api(`/storage/v1/object/${BUCKET}/${name}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-upsert": "true" },
  body: JSON.stringify(dump),
});
if (!up.ok) throw new Error(`upload: ${up.status} ${await up.text()}`);
console.log(`uploaded ${name}`);

// retention: keep the newest KEEP files
const list = await api(`/storage/v1/object/list/${BUCKET}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prefix: "", limit: 200, sortBy: { column: "name", order: "desc" } }),
});
const files = (await list.json()).map((f) => f.name).filter((n) => n.startsWith("backup-"));
for (const old of files.slice(KEEP)) {
  await api(`/storage/v1/object/${BUCKET}/${old}`, { method: "DELETE" });
  console.log(`deleted old ${old}`);
}
