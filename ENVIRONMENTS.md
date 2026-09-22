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
