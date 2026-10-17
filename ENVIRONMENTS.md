# Environments & Secrets

No real secret values live in this repo, not even in a gitignored local file — every
credential is kept in **GitHub repository secrets** and injected at build/CI time.
`.env.local.example` documents the variable *names* only.

## Required secrets

Set these under **GitHub repo → Settings → Secrets and variables → Actions**:

| Secret name | Where to find it | Used by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API | build (baked into client bundle) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page — the **publishable** key (`sb_publishable_...`) | build (baked into client bundle) |
| `SUPABASE_SECRET_KEY` | Same page — the **secret** key (`sb_secret_...`) | server-only, e.g. `src/lib/supabase/admin.ts` — **never** passed to a client build step |
| `SESSION_SECRET` | Generate your own: `openssl rand -base64 32` (or any 32+ byte random string) | signs the login session cookie (`src/lib/auth/session.ts`) — server-only, never passed to a client build step. **Must** be set in Vercel → Project → Settings → Environment Variables, or login is broken in production. |
| `SUPABASE_DB_URL` | Supabase Dashboard → Project Settings → Database → Connection string → **Session pooler** (replace `[YOUR-PASSWORD]`) | `.github/workflows/migrate.yml` — applies new `supabase/migrations/*.sql` on every push to main. Optional: without it the workflow just skips and migrations are run by hand. |

`NEXT_PUBLIC_*` vars get compiled into the browser bundle at build time, so they're not
secret in the usual sense (anyone can read them from the deployed site) — but they still
belong in GitHub Secrets rather than committed to the repo, so the actual project URL/key
pair isn't sitting in plaintext in git history for a different project's tenant.
`SUPABASE_SECRET_KEY` is a real secret (bypasses RLS) and must only ever be read by a
server-side build/deploy step, never exposed to the client.

## Local development

This repo intentionally ships no local secrets file. To run `npm run dev` locally, create
your own `.env.local` (copy `.env.local.example`, fill in real values from Supabase
Dashboard → Project Settings → API) — it's gitignored, so it never leaves your machine.
That local file is *yours* to create/manage; this repo won't write real values into it for
you, matching the "secrets only in GitHub Secrets" policy above.

## CI

`.github/workflows/ci.yml` runs typecheck + build on every push, reading the three secrets
above into the build environment. Add a real deploy step (Vercel/Netlify/other) once a
hosting target is chosen — it will consume the same three secrets.

## Database schema

`supabase/migrations/0001_init.sql` is the reference schema. Apply it once, manually, via
Supabase Dashboard → SQL Editor → paste the file → Run. There is no CI step that runs
migrations automatically yet.

## Backups

`.github/workflows/backup.yml` runs weekly (and on demand from the Actions tab) and writes
`backup-YYYY-MM-DD.json` — every table's data — to a **private** Supabase Storage bucket
named `backups`, keeping the newest 8. Download one from Supabase → Storage → backups.
It uses the existing `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` secrets.

This repo is **public**: never commit a backup, and don't use workflow artifacts for them
(artifacts of a public repo are downloadable by anyone). Uploaded files (slips, logos,
signatures, brand images) live in their own storage buckets and aren't part of this dump.

## Database access & lock-down

The browser never talks to Supabase directly any more. `src/lib/supabase/client.ts`
reroutes every REST call to `/api/sb/*`, which checks the login session and the
per-table rules in `src/lib/supabase/proxyRules.ts` (tests: `npm test`) before calling
Supabase with the service-role key. File uploads use one-shot signed URLs from
`/api/storage/sign`. Public pages (client link, share links) read via the server with
the service key, filtered by their token.

`supabase/lockdown/lock_down.sql` then removes every "open access" policy so the anon key
(visible in the site's JavaScript) can no longer read or write anything. It is **not** a
migration and is never run by the workflow — run it by hand in the SQL editor once you've
checked the app works through the proxy. `supabase/lockdown/rollback.sql` undoes it.

## Daily LINE digest

`vercel.json` runs `/api/cron/line-digest` every day at 01:00 UTC (08:00 Bangkok). It sends
today's summary (payments overdue > 7 days, tasks due/overdue, pending leave requests) to a
LINE group through the Messaging API. Set these in **Vercel → Settings → Environment
Variables** (they're read at runtime — not build-time, not GitHub):

| Variable | What |
|---|---|
| `CRON_SECRET` | any long random string — Vercel sends it as `Authorization: Bearer …` to the cron route; without it the route refuses to run |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers → your Messaging API channel → Channel access token (long-lived) |
| `LINE_TO` | the group's ID (`C…`) — invite the bot to the group, then read the group ID from a webhook event or `https://api.line.me/v2/bot/group/…`; a user ID (`U…`) also works for 1:1 |

Settings → ระบบ has a preview and a "send now" button (owner only). Nothing is sent when
there is nothing to report.

## Region

`vercel.json` pins serverless functions to `sin1` (Singapore) because the Supabase project
runs in `ap-southeast-1`. Left on Vercel's default (US East) every database call crosses the
Pacific and pages that fire many requests take several seconds.

## AI workspace API (`/api/ai/*`)

The Claude workspace folder ("พร้อมโพส งานลูกค้า", `_tools/*.mjs`) reads clients/tasks and
loads/edits tasks through token-protected endpoints instead of calling Supabase with a key:

| Endpoint | What |
|---|---|
| `GET /api/ai/export` | read-only snapshot (clients without `portal_token`, notes, tasks, packages, rounds, content sets) |
| `GET /api/ai/tasks?ids=…` | read specific tasks |
| `POST /api/ai/tasks` | create a batch for one client slug (insert only, refuses duplicate titles, `dryRun` supported) |
| `PATCH /api/ai/tasks` | compare-and-set edits of title/script/notes/shots/equipment/dates/ref/category — never status, assignee, client or delete |

Set **`AI_API_TOKEN`** in Vercel (≥ 24 random characters, a *normal* variable, **not** "Sensitive" —
sensitive values are blanked by `vercel env pull`, which is how the workspace tools read it). Without
the variable the endpoints answer 503.
