import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("social_accounts")
    .select(`*, social_snapshots (followers, avg_likes, engagement_rate, recorded_at)`)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, platform, handle, account_type = "own" } = body;

  if (!name || !platform || !handle) {
    return NextResponse.json({ error: "name, platform, and handle are required" }, { status: 400 });
  }

  const clean = handle.trim().replace(/^@/, "").toLowerCase();

  // Insert with zeroed metrics — sync will fill them in for Instagram
  const { data: account, error } = await supabase
    .from("social_accounts")
    .insert([{ name, platform, handle: clean, account_type, followers: 0, avg_likes: 0, avg_comments: 0, engagement_rate: 0 }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // For Instagram: immediately fetch live metrics
  if (platform === "instagram") {
    try {
      const origin = req.headers.get("origin") ?? req.headers.get("host") ?? "http://localhost:3000";
      const base   = origin.startsWith("http") ? origin : `https://${origin}`;
      await fetch(`${base}/api/social-accounts/sync`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ accountId: account.id }),
      });
      // Re-fetch updated account
      const { data: updated } = await supabase
        .from("social_accounts")
        .select(`*, social_snapshots (followers, avg_likes, engagement_rate, recorded_at)`)
        .eq("id", account.id)
        .single();
      if (updated) return NextResponse.json(updated);
    } catch {
      // Sync failed — return the account anyway, user can sync manually
    }
  }

  return NextResponse.json({ ...account, social_snapshots: [] });
}
