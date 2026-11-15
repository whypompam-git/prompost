import { NextResponse, type NextRequest } from "next/server";
import { caller } from "@/lib/draftsServer";

export const dynamic = "force-dynamic";

// Which workspace this session is in (for the switcher).
export async function GET(request: NextRequest) {
  const c = await caller(request);
  if (c instanceof NextResponse) return c;
  return NextResponse.json({ workspaceId: c.workspaceId });
}
