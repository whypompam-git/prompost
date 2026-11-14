import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/aiApi";
import { caller } from "@/lib/draftsServer";
import { goalProgressFor, saveGoal } from "@/lib/goalServer";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Progress Tracking for the owner: everyone's goal and progress, and set a goal for anyone.
export async function GET(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.role !== "owner") return NextResponse.json({ error: "owner only" }, { status: 403 });
  const db = createAdminClient();
  const { data: staff, error } = await db.from("staff").select("id, name, role, position, photo_url, positions(own_only)").eq("is_active", true).order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const progress = await goalProgressFor(db, (staff ?? []).map((s) => s.id));
  return NextResponse.json({
    people: (staff ?? []).map((s) => ({ id: s.id, name: s.name, position: s.position ?? "", photoUrl: s.photo_url ?? null, outsource: s.role !== "owner" && Boolean((Array.isArray(s.positions) ? s.positions[0] : s.positions)?.own_only), ...progress.get(s.id)! })),
  });
}

export async function POST(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.role !== "owner") return NextResponse.json({ error: "owner only" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (!isUuid(body.staffId)) return NextResponse.json({ error: "invalid request" }, { status: 400 });
  const err = await saveGoal(createAdminClient(), body.staffId, c.staffId, body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  return NextResponse.json({ ok: true });
}
