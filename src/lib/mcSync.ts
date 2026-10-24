// Server-only: pulls the MC Google Sheet and upserts mc_profiles. Only the
// sheet-owned columns are written — rates we quoted, notes, extra photos and
// the hidden flag are never touched. Tally photo links are copied into our own
// storage so they keep working if the form's link expires.
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapSheet, parseCsv, sheetCsvUrl } from "@/lib/mcSheet";

export type McSyncResult = { ok: boolean; added: number; updated: number; photos: number; total: number; error?: string };

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic" };

async function copyPhoto(source: string, key: string): Promise<string | null> {
  const db = createAdminClient();
  const res = await fetch(source, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return null;
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!type.startsWith("image/")) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return null;
  const hash = createHash("sha1").update(source).digest("hex").slice(0, 10);
  const path = `mc/${key}-${hash}.${EXT[type] ?? "jpg"}`;
  const { error } = await db.storage.from("client-brand").upload(path, buf, { contentType: type, upsert: true });
  if (error) return null;
  return db.storage.from("client-brand").getPublicUrl(path).data.publicUrl;
}

export async function syncMcSheet(): Promise<McSyncResult> {
  const db = createAdminClient();
  const fail = async (error: string): Promise<McSyncResult> => {
    await db.from("mc_settings").update({ last_result: `ผิดพลาด: ${error}` }).eq("id", true);
    return { ok: false, added: 0, updated: 0, photos: 0, total: 0, error };
  };
  try {
    const { data: settings } = await db.from("mc_settings").select("sheet_url").eq("id", true).maybeSingle();
    const url = settings?.sheet_url ? sheetCsvUrl(settings.sheet_url) : null;
    if (!url) return await fail("ยังไม่ได้ตั้งลิงก์ Google Sheet");

    const res = await fetch(url, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(30_000) });
    const text = await res.text();
    if (!res.ok || /^\s*<(!doctype|html)/i.test(text)) return await fail("อ่านชีตไม่ได้ — ตรวจว่าแชร์เป็น \"ทุกคนที่มีลิงก์ดูได้\"");

    const { profiles, missing } = mapSheet(parseCsv(text));
    if (missing.length) return await fail(`ไม่พบคอลัมน์ที่จำเป็นในชีต: ${missing.join(", ")}`);

    const { data: existing } = await db.from("mc_profiles").select("source_id, photo_source, photo_url");
    const known = new Map((existing ?? []).map((e) => [e.source_id as string, e]));
    let photos = 0;
    const rows = [];
    for (const p of profiles) {
      const prev = known.get(p.source_id);
      let photo_url = prev?.photo_url ?? null;
      let photo_source = prev?.photo_source ?? null;
      if (p.photo_source && (p.photo_source !== prev?.photo_source || !prev?.photo_url)) {
        const copied = await copyPhoto(p.photo_source, p.source_id.replace(/[^A-Za-z0-9_-]/g, ""));
        if (copied) {
          photo_url = copied;
          photo_source = p.photo_source;
          photos++;
        }
      }
      rows.push({ ...p, photo_url, photo_source, synced_at: new Date().toISOString() });
    }
    if (rows.length > 0) {
      const { error } = await db.from("mc_profiles").upsert(rows, { onConflict: "source_id" });
      if (error) return await fail(error.message);
    }
    const added = rows.filter((r) => !known.has(r.source_id)).length;
    const result: McSyncResult = { ok: true, added, updated: rows.length - added, photos, total: rows.length };
    await db
      .from("mc_settings")
      .update({ last_synced_at: new Date().toISOString(), last_result: `อัปเดตแล้ว ${rows.length} คน (ใหม่ ${added}, รูปที่คัดลอก ${photos})` })
      .eq("id", true);
    return result;
  } catch (err) {
    return await fail(err instanceof Error ? err.message : "failed");
  }
}
