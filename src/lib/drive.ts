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
