import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Public — powers the login picker (name + avatar only, never pin_hash).
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("staff")
    .select("id, name, avatar_color, position")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const keyFingerprint = createHash("sha256")
    .update(process.env.SUPABASE_SECRET_KEY ?? "")
    .digest("hex")
    .slice(0, 12);
  const urlFingerprint = createHash("sha256")
    .update(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
    .digest("hex")
    .slice(0, 12);

  return NextResponse.json(
    (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      avatarColor: r.avatar_color,
      position: r.position,
    })),
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Debug-Key-Fingerprint": keyFingerprint,
        "X-Debug-Url-Fingerprint": urlFingerprint,
        "X-Debug-Timestamp": new Date().toISOString(),
      },
    },
  );
}
