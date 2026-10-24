import type { McProfile } from "./types.ts";

// the photo shown for an MC: a hand-added one wins over the synced one
export const mcPhoto = (p: Pick<McProfile, "extraPhotos" | "photoUrl">) => p.extraPhotos[0] ?? p.photoUrl;

export const baht = (n: number) => `฿${n.toLocaleString("th-TH")}`;

export const withScheme = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);
