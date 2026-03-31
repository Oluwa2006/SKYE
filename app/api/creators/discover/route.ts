import { NextResponse } from "next/server";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

function estimateCost(followers: number) {
  if (followers < 10_000)       return { min: 10,   max: 100   };
  if (followers < 100_000)      return { min: 100,  max: 500   };
  if (followers < 500_000)      return { min: 500,  max: 5000  };
  return                               { min: 5000, max: 20000 };
}

function parseTags(bio: string): string[] {
  const hashtags = (bio.match(/#\w+/g) ?? []).map(h => h.slice(1).toLowerCase()).slice(0, 4);
  return hashtags.length ? hashtags : [];
}

// Normalise whichever shape the API returns into a flat object
function extractFields(json: Record<string, unknown>) {
  // Try multiple wrapper shapes:
  // instagram-scraper-20251: { data: {...} } or { user: {...} } or flat
  // instagram-scraper-api2:  { data: {...} }
  // graphql:                 { data: { graphql: { user: {...} } } }
  const body   = json?.body   as Record<string, unknown> | undefined;
  const result = json?.result as Record<string, unknown> | undefined;
  const d1 = (json?.data ?? json?.user ?? body ?? result ?? json) as Record<string, unknown>;
  const graphql = d1?.graphql as Record<string, unknown> | undefined;
  const user = (graphql?.user ?? d1) as Record<string, unknown>;

  const followers: number =
    (user.follower_count as number) ??
    (user.followers_count as number) ??
    ((user.edge_followed_by as Record<string,number>)?.count) ?? 0;

  const mediaCount: number =
    (user.media_count as number) ??
    ((user.edge_owner_to_timeline_media as Record<string,number>)?.count) ?? 0;

  const bio: string        = (user.biography as string) ?? (user.bio as string) ?? "";
  const fullName: string   = (user.full_name as string) ?? (user.name as string) ?? (user.fullName as string) ?? "";
  const isPrivate: boolean = !!(user.is_private ?? user.isPrivate ?? false);
  const isVerified: boolean= !!(user.is_verified ?? user.isVerified ?? false);
  const username: string   = (user.username as string) ?? (user.userName as string) ?? "";

  const profilePic: string =
    (user.profile_pic_url_hd as string) ??
    ((user.hd_profile_pic_url_info as Record<string,string>)?.url) ??
    (user.profile_pic_url as string) ??
    (user.profilePicUrl as string) ?? "";

  return { followers, mediaCount, bio, fullName, isPrivate, isVerified, username, profilePic };
}

// ── Try API 1: instagram-scraper-20251 (subscribed) ──────────────────────────
async function tryApi1(clean: string, key: string) {
  const res = await fetch(
    `https://instagram-scraper-20251.p.rapidapi.com/userinfo/?username_or_id=${clean}`,
    {
      headers: {
        "Content-Type":    "application/json",
        "x-rapidapi-key":  key,
        "x-rapidapi-host": "instagram-scraper-20251.p.rapidapi.com",
      },
    }
  );
  if (!res.ok) {
    console.log(`[discover] api1 HTTP ${res.status} for ${clean}`);
    return null;
  }
  const json = await res.json();
  console.log(`[discover] api1 raw keys for ${clean}:`, Object.keys(json ?? {}));
  const fields = extractFields(json);
  console.log(`[discover] api1 extracted for ${clean}:`, { username: fields.username, fullName: fields.fullName, followers: fields.followers });
  // Accept if we got any meaningful data
  if (!fields.username && !fields.fullName && fields.followers === 0) return null;
  return fields;
}

// ── Try API 2: instagram120 (subscribed) — POST /userInfo ────────────────────
async function tryApi2(clean: string, key: string) {
  // Try userInfo first, fall back to profile endpoint
  for (const endpoint of ["userInfo", "profile"]) {
    try {
      const res = await fetch(
        `https://instagram120.p.rapidapi.com/api/instagram/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type":    "application/json",
            "x-rapidapi-key":  key,
            "x-rapidapi-host": "instagram120.p.rapidapi.com",
          },
          body: JSON.stringify({ username: clean }),
        }
      );
      if (!res.ok) continue;
      const json = await res.json();
      const topKeys = Object.keys(json ?? {});
      console.log(`[discover] api2/${endpoint} raw keys for ${clean}:`, topKeys);
      // instagram120 returns { success: false, message: ... } for not-found accounts
      if (json?.success === false) { continue; }
      // instagram120 wraps data under { result: { ... } }
      const d = (json?.result ?? json?.data ?? json?.user ?? json) as Record<string, unknown>;
      console.log(`[discover] api2/${endpoint} result keys for ${clean}:`, Object.keys(d ?? {}));
      const username: string   = (d.username as string) ?? "";
      const fullName: string   = (d.full_name as string) ?? (d.fullName as string) ?? "";
      const followers: number  = (d.follower_count as number) ?? (d.followers_count as number) ?? (d.followers as number) ?? 0;
      const mediaCount: number = (d.media_count as number) ?? 0;
      const bio: string        = (d.biography as string) ?? "";
      const isPrivate: boolean = !!(d.is_private ?? false);
      const isVerified: boolean= !!(d.is_verified ?? false);
      const profilePic: string =
        (d.profile_pic_url_hd as string) ??
        ((d.hd_profile_pic_url_info as Record<string,string>)?.url) ??
        (d.profile_pic_url as string) ?? "";
      if (!username && !fullName && followers === 0) continue;
      return { username: username || clean, fullName, followers, mediaCount, bio, isPrivate, isVerified, profilePic };
    } catch { continue; }
  }
  return null;
}

// ── Try API 3: instagram-scraper-stable-api ───────────────────────────────────
async function tryApi3(clean: string, key: string) {
  // Stable API uses a different PHP-style endpoint for profile info
  const res = await fetch(
    `https://instagram-scraper-stable-api.p.rapidapi.com/get_ig_user_info.php`,
    {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-rapidapi-key":  key,
        "x-rapidapi-host": "instagram-scraper-stable-api.p.rapidapi.com",
      },
      body: JSON.stringify({ username_or_url: clean }),
    }
  );
  if (!res.ok) return null;
  const json = await res.json();
  const d = (Array.isArray(json) ? json[0] : json?.data ?? json) as Record<string, unknown>;
  if (!d) return null;

  const followers: number  = (d.follower_count as number) ?? (d.followers as number) ?? 0;
  const mediaCount: number = (d.media_count as number) ?? 0;
  const bio: string        = (d.biography as string) ?? "";
  const fullName: string   = (d.full_name as string) ?? "";
  const isPrivate: boolean = (d.is_private as boolean) ?? false;
  const isVerified: boolean= (d.is_verified as boolean) ?? false;
  const username: string   = (d.username as string) ?? clean;
  const profilePic: string = (d.profile_pic_url_hd as string) ?? (d.profile_pic_url as string) ?? "";

  if (!username) return null;
  return { followers, mediaCount, bio, fullName, isPrivate, isVerified, username, profilePic };
}

export async function POST(req: Request) {
  const { handle } = await req.json();

  if (!handle?.trim()) {
    return NextResponse.json({ error: "Handle required" }, { status: 400 });
  }
  if (!RAPIDAPI_KEY) {
    return NextResponse.json({ error: "RAPIDAPI_KEY not configured" }, { status: 500 });
  }

  const clean = handle.trim().replace(/^@/, "").toLowerCase();

  try {
    // Try each API in order — use whichever one the account is subscribed to
    const fields =
      (await tryApi1(clean, RAPIDAPI_KEY)) ??
      (await tryApi2(clean, RAPIDAPI_KEY)) ??
      (await tryApi3(clean, RAPIDAPI_KEY));

    if (!fields) {
      return NextResponse.json(
        {
          error: `@${clean} not found or couldn't be fetched. The account may not exist, be private, or Instagram may have blocked the request. Try a different handle.`,
        },
        { status: 502 }
      );
    }

    if (fields.isPrivate) {
      return NextResponse.json(
        { error: `@${clean} is a private account — can't read their stats.` },
        { status: 400 }
      );
    }

    const { min, max } = estimateCost(fields.followers);

    const creator = {
      handle:            clean,
      name:              fields.fullName || clean,
      platform:          "instagram",
      profile_photo_url: fields.profilePic,
      bio:               fields.bio,
      followers:         fields.followers,
      media_count:       fields.mediaCount,
      is_verified:       fields.isVerified,
      engagement_rate:   0,
      avg_views:         0,
      posts_per_week:    0,
      niche_tags:        parseTags(fields.bio),
      brand_fit_score:   0,
      est_cost_min:      min,
      est_cost_max:      max,
      profile_url:       `https://www.instagram.com/${clean}/`,
    };

    return NextResponse.json({ creator });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lookup failed" },
      { status: 500 }
    );
  }
}
