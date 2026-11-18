// Google Drive file links (files must be shared "anyone with the link").
export function driveId(url?: string | null): string | undefined {
  if (!url) return undefined;
  const m = /\/file\/d\/([\w-]{10,})/.exec(url) ?? /[?&]id=([\w-]{10,})/.exec(url);
  return m?.[1];
}

export function driveThumb(url?: string | null): string | undefined {
  const id = driveId(url);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w480` : undefined;
}

// Drive's own player, embeddable in our pages
export const drivePreview = (url?: string | null) => {
  const id = driveId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : undefined;
};

// direct download (Drive may show its "can't scan for viruses" page first for big files)
export const driveDownload = (url?: string | null) => {
  const id = driveId(url);
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : undefined;
};

// ── Social links (TikTok / Facebook / Instagram / YouTube) pasted as the Final ──
export type SocialKind = "tiktok" | "facebook" | "instagram" | "youtube";
export const SOCIAL_LABEL: Record<SocialKind, string> = { tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", youtube: "YouTube" };

export function socialKind(url?: string | null): SocialKind | undefined {
  if (!url) return undefined;
  const u = url.toLowerCase();
  if (/tiktok\.com/.test(u)) return "tiktok";
  if (/facebook\.com|fb\.watch|fb\.com/.test(u)) return "facebook";
  if (/instagram\.com|instagr\.am/.test(u)) return "instagram";
  if (/youtube\.com|youtu\.be/.test(u)) return "youtube";
  return undefined;
}

// An embeddable player URL when the link has enough in it to build one (short share links such
// as vt.tiktok.com/xxxx don't carry the video id — those just open in the app).
export function socialEmbed(url?: string | null): string | undefined {
  const kind = socialKind(url);
  if (!kind || !url) return undefined;
  const href = url.startsWith("http") ? url : `https://${url}`;
  switch (kind) {
    case "tiktok": {
      const id = /\/video\/(\d{8,})/.exec(href)?.[1];
      return id ? `https://www.tiktok.com/embed/v2/${id}` : undefined;
    }
    case "instagram": {
      const m = /instagram\.com\/(?:[\w.]+\/)?(reel|reels|p|tv)\/([\w-]+)/i.exec(href);
      return m ? `https://www.instagram.com/${m[1] === "reels" ? "reel" : m[1]}/${m[2]}/embed` : undefined;
    }
    case "youtube": {
      const id = /youtu\.be\/([\w-]{6,})/.exec(href)?.[1] ?? /[?&]v=([\w-]{6,})/.exec(href)?.[1] ?? /\/(?:shorts|embed|live)\/([\w-]{6,})/.exec(href)?.[1];
      return id ? `https://www.youtube.com/embed/${id}` : undefined;
    }
    case "facebook":
      return /facebook\.com\/(?:.+\/)?(videos|reel|watch|share\/[rv])|fb\.watch/.test(href) ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(href)}&show_text=false` : undefined;
  }
}
