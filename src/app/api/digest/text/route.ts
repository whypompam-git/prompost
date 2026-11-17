import { NextResponse, type NextRequest } from "next/server";
import { caller } from "@/lib/draftsServer";
import { fetchLiveAccess } from "@/lib/auth/session";
import { buildDigestText } from "@/lib/lineDigest";

export const dynamic = "force-dynamic";

// Today's summary as text to copy into LINE — for any team member (not own-only editors).
// Payments are included only for people who may see money.
export async function GET(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  if (c.ownOnly) return NextResponse.json({ error: "not available" }, { status: 403 });
  const live = await fetchLiveAccess(c.staffId);
  const money = c.role === "owner" || Boolean(live?.permissions.accounting || live?.permissions.documents || live?.permissions.financialTotals);
  const topics = money ? ["payments", "tasks", "leave"] : ["tasks", "leave"];
  const text = await buildDigestText(c.workspaceId, new Date(), { topics });
  return NextResponse.json({ text: text ?? "✅ วันนี้ไม่มีเรื่องที่ต้องแจ้ง" });
}
