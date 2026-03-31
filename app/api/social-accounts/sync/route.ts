import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = "instagram-scraper-20251.p.rapidapi.com";

function parseProfileData(json: Record<string, unknown>, handle: string) {
  const d = (json?.data ?? json?.user ?? json?.body ?? json?.result ?? json) as Record<string, unknown>;
  if (!d) return null;

  const followers: number =
    (d.follower_count as number) ??
    (d.followers_count as number) ??
    (d.followers as number) ??
    ((d.edge_followed_by as Record<string, number>)?.count) ?? 0;

  const following: number =
    (d.following_count as number) ??
    (d.edge_follow as Record<string, number>)?.count ?? 0;

  const posts_count: number =
    (d.media_count as number) ??
    ((d.edge_owner_to_timeline_media as Record<string, number>)?.count) ?? 0;

  const profile_image_url: string =
    (d.profile_pic_url_hd as string) ??
    ((d.hd_profile_pic_url_info as Record<string, string>)?.url) ??
    (d.profile_pic_url as string) ?? "";

  const full_name: string = (d.full_name as string) ?? (d.name as string) ?? "";
  const biography: string = (d.biography as string) ?? "";
  const is_verified: boolean = !!(d.is_verified ?? false);

  // Must have at least a username or followers to be valid
  const username = (d.username as string) ?? "";
  if (!username && followers === 0) return null;

  return { followers, following, posts_count, profile_image_url, full_name, biography, is_verified };
}

async function fetchInstagramProfile(handle: string) {
  if (!RAPIDAPI_KEY) throw new Error("RAPIDAPI_KEY is not set");

  // Try primary API: instagram-scraper-20251
  const res1 = await fetch(
    `https://${RAPIDAPI_HOST}/userinfo/?username_or_id=${handle}`,
    {
      headers: {
        "Content-Type":    "application/json",
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key":  RAPIDAPI_KEY,
      },
    }
  );

  if (res1.ok) {
    const json = await res1.json();
    console.log(`[sync] api1 raw keys for ${handle}:`, Object.keys(json ?? {}));
    const profile = parseProfileData(json, handle);
    if (profile) return profile;
  } else {
    console.log(`[sync] api1 HTTP ${res1.status} for ${handle}, trying instagram120`);
  }

  // Fallback: instagram120 — POST /userInfo
  for (const endpoint of ["userInfo", "profile"]) {
    try {
      const res2 = await fetch(
        `https://instagram120.p.rapidapi.com/api/instagram/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type":    "application/json",
            "x-rapidapi-key":  RAPIDAPI_KEY,
            "x-rapidapi-host": "instagram120.p.rapidapi.com",
          },
          body: JSON.stringify({ username: handle }),
        }
      );
      if (!res2.ok) continue;
      const json2 = await res2.json();
      console.log(`[sync] api2/${endpoint} raw keys for ${handle}:`, Object.keys(json2 ?? {}));
      const profile = parseProfileData(json2, handle);
      if (profile) return profile;
    } catch { continue; }
  }

  throw new Error(`Could not fetch profile for @${handle} from any API`);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { accountId } = body as { accountId?: string };

  let query = supabase.from("social_accounts").select("*").eq("platform", "instagram");
  if (accountId) {
    query = supabase.from("social_accounts").select("*").eq("id", accountId) as typeof query;
  }

  const { data: accounts, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!accounts?.length) return NextResponse.json({ error: "No Instagram accounts found" }, { status: 404 });

  const results = [];

  for (const account of accounts) {
    if (account.platform !== "instagram") {
      results.push({ id: account.id, status: "skipped", reason: "Only Instagram supported" });
      continue;
    }

    try {
      const profile = await fetchInstagramProfile(account.handle);

      // Simple engagement estimate from avg_likes if available
      const engagement_rate =
        profile.followers > 0 && account.avg_likes > 0
          ? parseFloat(((account.avg_likes / profile.followers) * 100).toFixed(2))
          : account.engagement_rate ?? 0;

      await supabase
        .from("social_accounts")
        .update({
          followers:         profile.followers,
          following:         profile.following,
          posts_count:       profile.posts_count,
          engagement_rate,
          last_updated:      new Date().toISOString(),
          ...(profile.profile_image_url ? { profile_image_url: profile.profile_image_url } : {}),
        })
        .eq("id", account.id);

      await supabase.from("social_snapshots").insert([{
        account_id:      account.id,
        followers:       profile.followers,
        avg_likes:       account.avg_likes ?? 0,
        engagement_rate,
      }]);

      results.push({
        id: account.id,
        status: "synced",
        followers:         profile.followers,
        following:         profile.following,
        posts_count:       profile.posts_count,
        avg_likes:         account.avg_likes ?? 0,
        engagement_rate,
        profile_image_url: profile.profile_image_url || null,
      });
    } catch (err) {
      results.push({
        id: account.id,
        status: "error",
        reason: err instanceof Error ? err.message : "Sync failed",
      });
    }
  }

  return NextResponse.json({ success: true, results });
}
