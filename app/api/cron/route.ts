import { NextRequest, NextResponse } from "next/server";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // Vercel sends Authorization: Bearer <CRON_SECRET> on cron invocations.
  // Block direct hits if a secret is configured.
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const res = await fetch(`${baseUrl}/api/run-pipeline`, { cache: "no-store" });
    const data = await res.json();

    return NextResponse.json({
      success: true,
      ranAt: new Date().toISOString(),
      pipeline: data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed" },
      { status: 500 }
    );
  }
}
