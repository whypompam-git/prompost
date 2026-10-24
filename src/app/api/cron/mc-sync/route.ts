import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { syncMcSheet } from "@/lib/mcSync";

export const dynamic = "force-dynamic";

// Called by Vercel Cron (daily) and by the hourly GitHub workflow, both with
// "Authorization: Bearer $CRON_SECRET". Reads the MC Google Sheet.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await syncMcSheet();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
