import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type SourceAnalysis = {
  hook_type: string | null;
  tone: string | null;
  score: number | null;
  ai_summary: string | null;
  topic: string | null;
};

type SourceSummary = {
  name: string;
  niche: string;
  platform: string;
  analyses: SourceAnalysis[];
};

export async function GET() {
  const { data: analyses, error } = await supabase
    .from("analysis")
    .select(`
      id, hook_type, tone, cta_type, topic, score, ai_summary, urgency, created_at,
      posts (
        source_id, caption, traction_score,
        sources ( name, niche, platform, url )
      )
    `)
    .not("score", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !analyses?.length) {
    return NextResponse.json({
      empty: true,
      summary: { totalAnalyses: 0, totalSources: 0, avgScore: 0, lastUpdated: null },
      hookDistribution: [], toneDistribution: [], sources: [], topPosts: [], bottomPosts: [],
    });
  }

  const hookMap = new Map<string, { count: number; totalScore: number }>();
  const toneMap = new Map<string, { count: number; totalScore: number }>();
  const ctaMap  = new Map<string, { count: number; totalScore: number }>();
  const sourceMap = new Map<string, SourceSummary>();

  for (const a of analyses) {
    const hook = a.hook_type ?? "Unknown";
    const tone = a.tone ?? "Unknown";
    const cta  = a.cta_type ?? "Unknown";
    const score = a.score ?? 0;
    const src = (a.posts as any)?.sources;
    const srcName = src?.name ?? "Unknown";
    const srcNiche = src?.niche ?? "";
    const srcPlatform = src?.platform ?? "";

    const h = hookMap.get(hook) ?? { count: 0, totalScore: 0 };
    hookMap.set(hook, { count: h.count + 1, totalScore: h.totalScore + score });

    const t = toneMap.get(tone) ?? { count: 0, totalScore: 0 };
    toneMap.set(tone, { count: t.count + 1, totalScore: t.totalScore + score });

    const c = ctaMap.get(cta) ?? { count: 0, totalScore: 0 };
    ctaMap.set(cta, { count: c.count + 1, totalScore: c.totalScore + score });

    const existing: SourceSummary = sourceMap.get(srcName) ?? {
      name: srcName,
      niche: srcNiche,
      platform: srcPlatform,
      analyses: [],
    };
    existing.analyses.push({ hook_type: a.hook_type, tone: a.tone, score: a.score, ai_summary: a.ai_summary, topic: a.topic });
    sourceMap.set(srcName, existing);
  }

  const hookDistribution = Array.from(hookMap.entries())
    .map(([hook, { count, totalScore }]) => ({ hook, count, avgScore: +(totalScore / count).toFixed(1) }))
    .sort((a, b) => b.count - a.count);

  const toneDistribution = Array.from(toneMap.entries())
    .map(([tone, { count, totalScore }]) => ({ tone, count, avgScore: +(totalScore / count).toFixed(1) }))
    .sort((a, b) => b.count - a.count);

  const ctaDistribution = Array.from(ctaMap.entries())
    .map(([cta, { count, totalScore }]) => ({ cta, count, avgScore: +(totalScore / count).toFixed(1) }))
    .sort((a, b) => b.count - a.count);

  const sources = Array.from(sourceMap.values()).map(({ name, niche, platform, analyses: sa }) => {
    const scores = sa.map(a => a.score ?? 0);
    const avgScore = scores.length ? +(scores.reduce((s, n) => s + n, 0) / scores.length).toFixed(1) : 0;
    const hf = new Map<string, number>();
    const tf = new Map<string, number>();
    for (const a of sa) {
      if (a.hook_type) hf.set(a.hook_type, (hf.get(a.hook_type) ?? 0) + 1);
      if (a.tone) tf.set(a.tone, (tf.get(a.tone) ?? 0) + 1);
    }
    const topHook = [...hf.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const topTone = [...tf.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return { name, niche, platform, postCount: sa.length, avgScore, topHook, topTone };
  }).sort((a, b) => b.postCount - a.postCount);

  const sorted = [...analyses].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const mapPost = (a: (typeof analyses)[0]) => ({
    id: a.id,
    source: (a.posts as any)?.sources?.name ?? "Unknown",
    hook_type: a.hook_type ?? "—",
    tone: a.tone ?? "—",
    score: a.score ?? 0,
    ai_summary: a.ai_summary ?? "",
    topic: a.topic ?? "",
  });

  const topPosts    = sorted.slice(0, 6).map(mapPost);
  const bottomPosts = [...sorted].reverse().slice(0, 6).map(mapPost);
  const avgScore    = +(analyses.reduce((s, a) => s + (a.score ?? 0), 0) / analyses.length).toFixed(1);

  return NextResponse.json({
    empty: false,
    summary: {
      totalAnalyses: analyses.length,
      totalSources: sourceMap.size,
      avgScore,
      lastUpdated: analyses[0]?.created_at ?? null,
    },
    hookDistribution,
    toneDistribution,
    ctaDistribution,
    sources,
    topPosts,
    bottomPosts,
  });
}
