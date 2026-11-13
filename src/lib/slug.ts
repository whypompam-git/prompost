// Friendly public client links: prompost.vercel.app/<slug>.
// Anything that is (or could become) an app route must never be a slug.
export const RESERVED_SLUGS = new Set([
  "dashboard", "calendar", "clients", "packages", "hr", "documents", "accounting",
  "settings", "profile", "tasks", "login", "api", "portal", "quote", "invoice",
  "receipt", "print", "info", "manifest", "sw", "icon", "favicon", "apple-touch-icon",
  "logo-source", "logout", "admin", "app", "static", "public", "mc", "workload", "mc-pack", "studio", "voucher", "contract", "contracts", "v2", "my-work",
]);

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (!base) return "";
  return RESERVED_SLUGS.has(base) ? `${base}-co` : base;
}

const SLUG_PATH = /^\/([a-z0-9-]+)(\/(?:info|review|plan|files))?$/;

// Public client-link paths (used by middleware): one segment that is not a
// reserved app route, optionally followed by one of the client-link tabs.
export function isClientSlugPath(pathname: string): boolean {
  const m = SLUG_PATH.exec(pathname);
  return !!m && !RESERVED_SLUGS.has(m[1]);
}

export const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export const clientLinkPath = (c: { slug?: string; portalToken: string }) =>
  c.slug ? `/${c.slug}` : `/portal/${c.portalToken}`;
