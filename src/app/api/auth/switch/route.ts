import { NextResponse, type NextRequest } from "next/server";
import { memberships, requireAccount, setSessions } from "@/lib/auth/accountServer";

export const dynamic = "force-dynamic";

// GET: the workspaces this login belongs to. POST {workspaceId}: switch into one.
export async function GET(request: NextRequest) {
  const acc = await requireAccount(request);
  if (acc instanceof NextResponse) return acc;
  return NextResponse.json({ workspaces: (await memberships(acc)).map(({ workspaceId, workspaceName, handle, role }) => ({ workspaceId, workspaceName, handle, role })) });
}

export async function POST(request: NextRequest) {
  const acc = await requireAccount(request);
  if (acc instanceof NextResponse) return acc;
  const { workspaceId } = await request.json().catch(() => ({}));
  const m = (await memberships(acc)).find((x) => x.workspaceId === workspaceId);
  if (!m) return NextResponse.json({ error: "คุณไม่ได้อยู่ใน workspace นี้" }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  await setSessions(res, acc, { id: m.staffId, name: m.name, role: m.role });
  return res;
}
