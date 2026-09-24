import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// Public — powers the login picker (name + avatar only, never pin_hash).
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("staff")
    .select("id, name, avatar_color, position, photo_url")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      avatarColor: r.avatar_color,
      position: r.position,
      photoUrl: r.photo_url ?? undefined,
    })),
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
