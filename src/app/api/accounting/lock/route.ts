import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { caller } from "@/lib/draftsServer";
import { fetchLiveAccess } from "@/lib/auth/session";
import { hashKey, record, tooMany } from "@/lib/rateLimit";
import { workspaceDb } from "@/lib/supabase/workspaceDb";

export const dynamic = "force-dynamic";

const UNLOCK_MINUTES = 20;
const TRIES = { max: 5, windowMs: 15 * 60_000 };
const validMonth = (m: unknown): m is string => typeof m === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

async function who(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  // accounting access = owner, or a staff member allowed to see accounting
  const live = await fetchLiveAccess(c.staffId);
  if (c.ownOnly || !live || !(live.role === "owner" || live.permissions.accounting)) return NextResponse.json({ error: "no access" }, { status: 403 });
  return c;
}

// Which months are locked / temporarily open, and whether a lock code exists.
export async function GET(request: NextRequest) {
  const c = await who(request);
  if (c instanceof NextResponse) return c;
  const db = workspaceDb(c.workspaceId);
  const [{ data: locks }, { data: set }] = await Promise.all([
    db.from("accounting_locks").select("month, locked_at, unlocked_until").order("month", { ascending: false }),
    db.from("accounting_lock_settings").select("workspace_id").maybeSingle(),
  ]);
  const now = Date.now();
  return NextResponse.json({
    hasCode: Boolean(set),
    isOwner: c.role === "owner",
    locks: (locks ?? []).map((l) => ({ month: l.month, lockedAt: l.locked_at, open: Boolean(l.unlocked_until && new Date(l.unlocked_until).getTime() > now), openUntil: l.unlocked_until && new Date(l.unlocked_until).getTime() > now ? l.unlocked_until : null })),
  });
}

export async function POST(request: NextRequest) {
  const c = await who(request);
  if (c instanceof NextResponse) return c;
  const b = await request.json().catch(() => ({}));
  const db = workspaceDb(c.workspaceId);
  const { data: set } = await db.from("accounting_lock_settings").select("code_hash").maybeSingle();

  if (b.action === "set-code") {
    if (c.role !== "owner") return NextResponse.json({ error: "เฉพาะเจ้าของตั้งรหัสล็อกได้" }, { status: 403 });
    const code = typeof b.code === "string" ? b.code.trim() : "";
    if (code.length < 4 || code.length > 40) return NextResponse.json({ error: "รหัสล็อกต้องยาว 4–40 ตัวอักษร" }, { status: 400 });
    if (set) {
      const key = hashKey(`acct:${c.staffId}`);
      if (await tooMany("acct_lock", key, TRIES)) return NextResponse.json({ error: "ใส่รหัสผิดหลายครั้ง รอ 15 นาทีแล้วลองใหม่" }, { status: 429 });
      if (typeof b.oldCode !== "string" || !bcrypt.compareSync(b.oldCode, set.code_hash)) {
        await record("acct_lock", key);
        return NextResponse.json({ error: "รหัสเดิมไม่ถูกต้อง" }, { status: 403 });
      }
    }
    const { error } = await db.from("accounting_lock_settings").upsert({ workspace_id: c.workspaceId, code_hash: bcrypt.hashSync(code, 10), updated_at: new Date().toISOString() }, { onConflict: "workspace_id" });
    if (error) return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!validMonth(b.month)) return NextResponse.json({ error: "invalid month" }, { status: 400 });

  if (b.action === "lock" || b.action === "relock") {
    if (!set) return NextResponse.json({ error: "ตั้งรหัสล็อกก่อน (ปุ่ม “ตั้งรหัสล็อก”)" }, { status: 400 });
    const { error } = await db.from("accounting_locks").upsert({ workspace_id: c.workspaceId, month: b.month, locked_at: new Date().toISOString(), locked_by: c.staffId, unlocked_until: null }, { onConflict: "workspace_id,month" });
    if (error) return NextResponse.json({ error: "ล็อกไม่สำเร็จ" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (b.action === "unlock") {
    if (!set) return NextResponse.json({ error: "ยังไม่ได้ตั้งรหัสล็อก" }, { status: 400 });
    const key = hashKey(`acct:${c.staffId}`);
    if (await tooMany("acct_lock", key, TRIES)) return NextResponse.json({ error: "ใส่รหัสผิดหลายครั้ง รอ 15 นาทีแล้วลองใหม่" }, { status: 429 });
    if (typeof b.code !== "string" || !bcrypt.compareSync(b.code, set.code_hash)) {
      await record("acct_lock", key);
      return NextResponse.json({ error: "รหัสไม่ถูกต้อง" }, { status: 403 });
    }
    const until = new Date(Date.now() + UNLOCK_MINUTES * 60_000).toISOString();
    const { error } = await db.from("accounting_locks").update({ unlocked_until: until }).eq("month", b.month);
    if (error) return NextResponse.json({ error: "ปลดล็อกไม่สำเร็จ" }, { status: 500 });
    return NextResponse.json({ ok: true, openUntil: until, minutes: UNLOCK_MINUTES });
  }

  if (b.action === "remove") {
    // take the lock off for good: needs the code too
    const key = hashKey(`acct:${c.staffId}`);
    if (!set || typeof b.code !== "string" || !bcrypt.compareSync(b.code, set.code_hash)) {
      await record("acct_lock", key);
      return NextResponse.json({ error: "รหัสไม่ถูกต้อง" }, { status: 403 });
    }
    await db.from("accounting_locks").delete().eq("month", b.month);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "invalid request" }, { status: 400 });
}
