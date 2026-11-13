// Google Drive file link → its thumbnail image (works for files shared "anyone with the link").
export function driveThumb(url?: string | null): string | undefined {
  if (!url) return undefined;
  const m = /\/file\/d\/([\w-]{10,})/.exec(url) ?? /[?&]id=([\w-]{10,})/.exec(url);
  return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w480` : undefined;
}
