import { NextResponse } from "next/server";
import { socialKind } from "@/lib/drive";

export const dynamic = "force-dynamic";

// A preview picture for a pasted social link. TikTok's own oEmbed gives a thumbnail (and the video
// id, so short share links can play too); YouTube has predictable thumbnails. Instagram / Facebook
// don't allow this without an app token, so those get a branded tile on the page instead.
// Only ever calls tiktok.com — never the address the visitor typed.
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url") ?? "";
  if (url.length > 600 || !/^https?:\/\//i.test(url)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const kind = socialKind(url);
  const headers = { "Cache-Control": "public, max-age=3600, s-maxage=86400" };
  if (kind === "youtube") {
    const id = /youtu\.be\/([\w-]{6,})/.exec(url)?.[1] ?? /[?&]v=([\w-]{6,})/.exec(url)?.[1] ?? /\/(?:shorts|embed|live)\/([\w-]{6,})/.exec(url)?.[1];
    return NextResponse.json({ thumb: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null, embed: null }, { headers });
  }
  if (kind !== "tiktok") return NextResponse.json({ thumb: null, embed: null }, { headers });
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!res.ok) return NextResponse.json({ thumb: null, embed: null }, { headers: { "Cache-Control": "public, max-age=300" } });
    const data = (await res.json()) as { thumbnail_url?: string; html?: string };
    const id = /data-video-id="(\d{8,})"/.exec(data.html ?? "")?.[1];
    return NextResponse.json({ thumb: data.thumbnail_url ?? null, embed: id ? `https://www.tiktok.com/embed/v2/${id}` : null }, { headers });
  } catch {
    return NextResponse.json({ thumb: null, embed: null }, { headers: { "Cache-Control": "public, max-age=300" } });
  }
}
