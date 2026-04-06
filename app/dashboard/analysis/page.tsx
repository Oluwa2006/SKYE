"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Brain, TrendingUp, Users, Zap, BookOpen, BarChart2,
  ChevronRight, RefreshCw, Sparkles, Lock, ArrowUpRight,
  Target, Eye, MessageSquare, Bookmark, Share2, UserPlus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface HookDist  { hook: string;  count: number; avgScore: number }
interface ToneDist  { tone: string;  count: number; avgScore: number }
interface CtaDist   { cta: string;   count: number; avgScore: number }
interface SourceRow { name: string; niche: string; platform: string; postCount: number; avgScore: number; topHook: string; topTone: string }
interface PostRow   { id: string; source: string; hook_type: string; tone: string; score: number; ai_summary: string; topic: string }

interface BehaviorData {
  empty: boolean;
  summary: { totalAnalyses: number; totalSources: number; avgScore: number; lastUpdated: string | null };
  hookDistribution: HookDist[];
  toneDistribution: ToneDist[];
  ctaDistribution:  CtaDist[];
  sources:    SourceRow[];
  topPosts:   PostRow[];
  bottomPosts: PostRow[];
}

interface Action { impact: "High" | "Medium" | "Low"; title: string; reason: string; expected: string }

type Section = "overview" | "my-content" | "competitors" | "audience" | "actions" | "learning";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function scoreCls(score: number) {
  return score >= 8 ? "bg-emerald-50 text-emerald-600"
       : score >= 5 ? "bg-amber-50 text-amber-600"
       : "glass-sub text-dm";
}

function ScoreBadge({ score }: { score: number }) {
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${scoreCls(score)}`}>{score}/10</span>;
}

function BarRow({ label, count, maxCount, avgScore, colorClass = "from-violet-500 to-violet-400" }: {
  label: string; count: number; maxCount: number; avgScore: number; colorClass?: string;
}) {
  const pct = maxCount > 0 ? Math.max(3, (count / maxCount) * 100) : 3;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-dp font-medium capitalize">{label}</span>
        <div className="flex items-center gap-2 text-xs text-dm">
          <span>{count} posts</span>
          <span className="text-gray-200">·</span>
          <span className={avgScore >= 7 ? "text-emerald-500 font-semibold" : avgScore >= 5 ? "text-amber-500" : ""}>
            {avgScore}/10 avg
          </span>
        </div>
      </div>
      <div className="h-1.5 glass-sub rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${colorClass} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <span className="text-[11px] glass-sub border border-glass text-ds px-2 py-0.5 rounded-lg font-medium capitalize">
      {text}
    </span>
  );
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-card rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

function LockedBadge() {
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold text-dm glass-sub border border-glass px-2 py-0.5 rounded-full">
      <Lock size={9} /> Coming soon
    </span>
  );
}

// ─── Compute actions from data ────────────────────────────────────────────────
function computeActions(data: BehaviorData): Action[] {
  const actions: Action[] = [];

  const topHook = data.hookDistribution[0];
  const bestHookByScore = [...data.hookDistribution].sort((a, b) => b.avgScore - a.avgScore)[0];
  const topTone = [...data.toneDistribution].sort((a, b) => b.avgScore - a.avgScore)[0];
  const topSource = data.sources[0];
  const bestPost  = data.topPosts[0];

  if (bestPost && topHook) {
    actions.push({
      impact: "High",
      title: `Use "${bestPost.hook_type}" hooks in your next post`,
      reason: `Your highest-scoring competitor post (${bestPost.score}/10) from ${bestPost.source} used a ${bestPost.hook_type} hook with ${bestPost.tone} tone. This is the proven formula in your niche right now.`,
      expected: "Avg engagement boost based on top competitor performance",
    });
  }

  if (topTone && topTone.avgScore >= 6) {
    actions.push({
      impact: "High",
      title: `Write in a "${topTone.tone}" tone`,
      reason: `${topTone.tone} tone averages ${topTone.avgScore}/10 across ${topTone.count} competitor posts — the highest scoring tone pattern in your niche.`,
      expected: `${topTone.avgScore >= 8 ? "Strong" : "Good"} audience resonance based on competitor data`,
    });
  }

  if (topSource) {
    actions.push({
      impact: "Medium",
      title: `Study ${topSource.name}'s content playbook`,
      reason: `${topSource.name} has the most analyzed posts (${topSource.postCount}) averaging ${topSource.avgScore}/10. Their winning formula: ${topSource.topHook} hook + ${topSource.topTone} tone.`,
      expected: "Borrow what's already working in your competitive space",
    });
  }

  if (bestHookByScore && bestHookByScore.hook !== topHook?.hook) {
    actions.push({
      impact: "Medium",
      title: `Test "${bestHookByScore.hook}" hooks (highest avg score)`,
      reason: `While ${topHook?.hook ?? "Curiosity"} hooks are most common, ${bestHookByScore.hook} hooks average ${bestHookByScore.avgScore}/10 — the highest score of any hook type. Less common means less competition.`,
      expected: `Potential ${bestHookByScore.avgScore}/10 performance vs niche average of ${data.summary.avgScore}/10`,
    });
  }

  const topCta = data.ctaDistribution?.[0];
  if (topCta) {
    actions.push({
      impact: "Low",
      title: `Use "${topCta.cta}" CTAs consistently`,
      reason: `${topCta.cta} is the most used CTA across your competitor posts (${topCta.count} times). Matching what your audience already responds to reduces friction.`,
      expected: "Better CTA click-through alignment with audience expectations",
    });
  }

  return actions;
}

// ─── Overview Section ─────────────────────────────────────────────────────────
function OverviewSection({ data }: { data: BehaviorData }) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const topHook    = data.hookDistribution[0];
  const topTone    = data.toneDistribution[0];
  const topSource  = data.sources[0];

  return (
    <div className="space-y-6">
      {/* Brief header */}
      <SectionCard>
        <div className="p-5 border-b border-glass-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-dm uppercase tracking-widest">Today's Intelligence Brief</p>
              <p className="text-sm font-semibold text-dp mt-0.5">{today}</p>
            </div>
            {data.summary.lastUpdated && (
              <span className="text-[11px] text-dm">Updated {timeAgo(data.summary.lastUpdated)}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-glass">
          {/* My Content */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-dm uppercase tracking-wider">My Content</p>
              <LockedBadge />
            </div>
            <div className="space-y-2">
              <div className="h-8 glass-sub rounded-lg w-3/4 animate-pulse" />
              <div className="h-3 glass-sub rounded w-full" />
              <div className="h-3 glass-sub rounded w-2/3" />
            </div>
            <p className="text-[11px] text-dm leading-relaxed">
              Connect your Instagram to unlock own content analysis.
            </p>
          </div>

          {/* Competitors */}
          <div className="p-5 space-y-3">
            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Competitors</p>
            {data.empty ? (
              <p className="text-sm text-dm">Run the pipeline to generate insights.</p>
            ) : (
              <div className="space-y-3">
                {topHook && (
                  <div className="p-3 bg-violet-50 rounded-xl">
                    <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-1">Top Hook</p>
                    <p className="text-sm font-semibold text-violet-700 capitalize">{topHook.hook}</p>
                    <p className="text-[11px] text-violet-400 mt-0.5">{topHook.count} posts · {topHook.avgScore}/10 avg</p>
                  </div>
                )}
                {topTone && (
                  <div className="p-3 glass-sub rounded-xl">
                    <p className="text-[10px] font-bold text-dm uppercase tracking-wider mb-1">Top Tone</p>
                    <p className="text-sm font-semibold text-dp capitalize">{topTone.tone}</p>
                    <p className="text-[11px] text-dm mt-0.5">{topTone.count} posts</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Audience */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-dm uppercase tracking-wider">Audience</p>
              <LockedBadge />
            </div>
            <div className="space-y-2">
              <div className="h-8 glass-sub rounded-lg w-3/4 animate-pulse" />
              <div className="h-3 glass-sub rounded w-full" />
              <div className="h-3 glass-sub rounded w-2/3" />
            </div>
            <p className="text-[11px] text-dm leading-relaxed">
              Audience behavior analysis unlocks with Instagram Insights.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Top action */}
      {!data.empty && topHook && (
        <SectionCard>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-amber-400 rounded-lg flex items-center justify-center">
                <Zap size={13} className="text-white" />
              </div>
              <p className="text-[10px] font-bold text-ds uppercase tracking-wider">Top Behavior Action Today</p>
            </div>
            <p className="text-sm text-dp leading-relaxed">
              <span className="font-semibold text-dh">{topHook.hook}</span> hooks dominate competitor content
              ({topHook.count} posts, {topHook.avgScore}/10 avg). Your niche average is{" "}
              <span className="font-semibold">{data.summary.avgScore}/10</span>.
              {topSource && ` Lead competitor: ${topSource.name} with ${topSource.postCount} posts analyzed.`}
            </p>
          </div>
        </SectionCard>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Posts Analyzed", value: data.summary.totalAnalyses, sub: "competitor content" },
          { label: "Sources Tracked", value: data.summary.totalSources, sub: "competitors" },
          { label: "Avg Score", value: `${data.summary.avgScore}/10`, sub: "across all analyses" },
        ].map(({ label, value, sub }) => (
          <SectionCard key={label} className="p-5">
            <p className="text-2xl font-bold text-dh">{value}</p>
            <p className="text-sm font-semibold text-dp mt-0.5">{label}</p>
            <p className="text-xs text-dm mt-0.5">{sub}</p>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

// ─── Competitors Section ──────────────────────────────────────────────────────
function CompetitorsSection({ data }: { data: BehaviorData }) {
  const [activeSource, setActiveSource] = useState<string | null>(null);

  if (data.empty) {
    return (
      <SectionCard className="p-12 text-center">
        <TrendingUp size={32} className="text-gray-200 mx-auto mb-3" />
        <p className="text-ds font-semibold">No competitor data yet</p>
        <p className="text-sm text-dm mt-1">Run the pipeline to scrape and analyze competitor posts.</p>
      </SectionCard>
    );
  }

  const maxHook   = Math.max(...data.hookDistribution.map(h => h.count));
  const maxTone   = Math.max(...data.toneDistribution.map(t => t.count));
  const selected  = activeSource ? data.sources.find(s => s.name === activeSource) : null;

  return (
    <div className="space-y-5">
      {/* Pattern charts */}
      <div className="grid grid-cols-2 gap-5">
        <SectionCard className="p-5">
          <p className="text-xs font-bold text-dh mb-4">Hook Type Performance</p>
          <div className="space-y-3">
            {data.hookDistribution.map(h => (
              <BarRow key={h.hook} label={h.hook} count={h.count} maxCount={maxHook} avgScore={h.avgScore} />
            ))}
          </div>
        </SectionCard>

        <SectionCard className="p-5">
          <p className="text-xs font-bold text-dh mb-4">Tone Performance</p>
          <div className="space-y-3">
            {data.toneDistribution.map(t => (
              <BarRow key={t.tone} label={t.tone} count={t.count} maxCount={maxTone} avgScore={t.avgScore}
                colorClass="from-blue-500 to-blue-400" />
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Source table */}
      <SectionCard>
        <div className="p-5 border-b border-glass-soft">
          <p className="text-xs font-bold text-dh">Competitor Dashboard</p>
          <p className="text-xs text-dm mt-0.5">Click a row to see their breakdown</p>
        </div>
        <div className="divide-y divide-glass">
          <div className="grid grid-cols-5 px-5 py-2.5 text-[10px] font-bold text-dm uppercase tracking-wider">
            <span className="col-span-2">Source</span>
            <span>Posts</span>
            <span>Avg Score</span>
            <span>Top Hook</span>
          </div>
          {data.sources.map(src => (
            <button
              key={src.name}
              onClick={() => setActiveSource(activeSource === src.name ? null : src.name)}
              className={`w-full grid grid-cols-5 px-5 py-3.5 text-left hover:glass-sub transition ${activeSource === src.name ? "bg-violet-50" : ""}`}
            >
              <div className="col-span-2">
                <p className="text-sm font-semibold text-dp">{src.name}</p>
                {src.niche && <p className="text-[11px] text-dm">{src.niche}</p>}
              </div>
              <span className="text-sm text-ds self-center">{src.postCount}</span>
              <span className="self-center"><ScoreBadge score={src.avgScore} /></span>
              <span className="text-sm text-ds self-center capitalize">{src.topHook}</span>
            </button>
          ))}
        </div>

        {/* Expanded source detail */}
        {selected && (
          <div className="border-t border-violet-100 bg-violet-50/50 p-5">
            <p className="text-xs font-bold text-violet-600 mb-3">{selected.name} — Deep Dive</p>
            <div className="grid grid-cols-4 gap-4 mb-4">
              {[
                { label: "Posts analyzed", value: selected.postCount },
                { label: "Avg score", value: `${selected.avgScore}/10` },
                { label: "Top hook", value: selected.topHook },
                { label: "Top tone", value: selected.topTone },
              ].map(({ label, value }) => (
                <div key={label} className="glass-card rounded-xl p-3 border border-violet-100">
                  <p className="text-[10px] text-dm uppercase tracking-wider font-bold">{label}</p>
                  <p className="text-sm font-semibold text-dp mt-1 capitalize">{value}</p>
                </div>
              ))}
            </div>
            <div className="glass-card rounded-xl border border-violet-100 p-3">
              <p className="text-[11px] text-violet-600 font-semibold">
                What you can steal from {selected.name}:
              </p>
              <p className="text-xs text-ds mt-1.5 leading-relaxed">
                Use <span className="font-semibold capitalize">{selected.topHook}</span> hooks with a{" "}
                <span className="font-semibold capitalize">{selected.topTone}</span> tone.
                They've posted {selected.postCount} times with an average score of {selected.avgScore}/10 —
                {selected.avgScore >= 7 ? " well above average. This formula is validated." : " study what makes their top posts work."}
              </p>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Top & Bottom Posts */}
      <div className="grid grid-cols-2 gap-5">
        <SectionCard>
          <div className="p-5 border-b border-glass-soft flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
            <p className="text-xs font-bold text-dh">Top Performing Posts</p>
          </div>
          <div className="divide-y divide-glass">
            {data.topPosts.map((p, i) => (
              <div key={p.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-dm">#{i + 1}</span>
                    <span className="text-[11px] font-semibold text-ds">{p.source}</span>
                  </div>
                  <ScoreBadge score={p.score} />
                </div>
                {p.ai_summary && (
                  <p className="text-xs text-ds leading-relaxed line-clamp-2">{p.ai_summary}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {[p.hook_type, p.tone].filter(Boolean).map((t, j) => <Tag key={j} text={t} />)}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <div className="p-5 border-b border-glass-soft flex items-center gap-2">
            <div className="w-2 h-2 bg-red-300 rounded-full" />
            <p className="text-xs font-bold text-dh">Lowest Performing Posts</p>
          </div>
          <div className="divide-y divide-glass">
            {data.bottomPosts.map((p, i) => (
              <div key={p.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-semibold text-ds">{p.source}</span>
                  <ScoreBadge score={p.score} />
                </div>
                {p.ai_summary && (
                  <p className="text-xs text-ds leading-relaxed line-clamp-2">{p.ai_summary}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {[p.hook_type, p.tone].filter(Boolean).map((t, j) => <Tag key={j} text={t} />)}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ─── My Content Section ───────────────────────────────────────────────────────
function MyContentSection() {
  const metrics = [
    { icon: Eye,         label: "Avg Views per Post",    phase: "Instagram Insights" },
    { icon: Bookmark,    label: "Avg Saves per Post",    phase: "Instagram Insights" },
    { icon: Share2,      label: "Avg Shares per Post",   phase: "Instagram Insights" },
    { icon: MessageSquare, label: "Avg Comments",        phase: "Instagram Insights" },
    { icon: UserPlus,    label: "Follower Growth",       phase: "Instagram Insights" },
    { icon: Target,      label: "Engagement Rate",       phase: "Instagram Insights" },
  ];

  return (
    <div className="space-y-5">
      <SectionCard className="p-8 text-center">
        <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <BarChart2 size={24} className="text-violet-400" />
        </div>
        <h3 className="text-base font-bold text-dp">Your Content Performance</h3>
        <p className="text-sm text-dm mt-2 max-w-sm mx-auto leading-relaxed">
          This section analyzes your own posting history — views, saves, shares, follower growth,
          best hooks, and posting time patterns. It learns what works for you specifically.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-dm glass-sub border border-glass px-3 py-1.5 rounded-full">
          <Lock size={11} />
          Requires Instagram Insights connection — coming in Phase 3
        </div>
      </SectionCard>

      <div className="grid grid-cols-3 gap-4">
        {metrics.map(({ icon: Icon, label, phase }) => (
          <SectionCard key={label} className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 glass-sub rounded-xl flex items-center justify-center">
                <Icon size={15} className="text-dm" />
              </div>
              <Lock size={11} className="text-dm" />
            </div>
            <p className="text-sm font-semibold text-dm">{label}</p>
            <p className="text-[10px] text-dm mt-1">{phase}</p>
          </SectionCard>
        ))}
      </div>

      <SectionCard className="p-5">
        <p className="text-xs font-bold text-dh mb-4">What My Content Analysis will include</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            "Performance dashboard (this week vs last week)",
            "Content pillar breakdown with bar charts",
            "Hook type analysis (which hooks work for YOU)",
            "Best posting time heatmap",
            "Top & bottom posts with AI explanation",
            "Content velocity & posting consistency",
          ].map(item => (
            <div key={item} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-violet-300 rounded-full mt-1.5 shrink-0" />
              <p className="text-xs text-ds">{item}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Audience Section ─────────────────────────────────────────────────────────
function AudienceSection() {
  const behaviors = [
    { icon: Bookmark,      label: "Saves",         color: "text-blue-400 bg-blue-50",    desc: "Content they want to return to" },
    { icon: Share2,        label: "Shares",        color: "text-violet-400 bg-violet-50", desc: "Content they want others to see" },
    { icon: MessageSquare, label: "Comments",      color: "text-amber-400 bg-amber-50",   desc: "Content that sparks conversation" },
    { icon: UserPlus,      label: "Follows",       color: "text-emerald-400 bg-emerald-50", desc: "Content that converts viewers" },
    { icon: Eye,           label: "Profile Visits", color: "text-pink-400 bg-pink-50",   desc: "Content that makes them want more" },
  ];

  return (
    <div className="space-y-5">
      <SectionCard className="p-8 text-center">
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Users size={24} className="text-blue-400" />
        </div>
        <h3 className="text-base font-bold text-dp">Audience Behavior Intelligence</h3>
        <p className="text-sm text-dm mt-2 max-w-sm mx-auto leading-relaxed">
          Understand exactly what makes your audience act — saves, shares, comments, follows.
          Not just demographics, but the specific content triggers that move them.
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-dm glass-sub border border-glass px-3 py-1.5 rounded-full">
          <Lock size={11} />
          Requires Instagram Insights — coming in Phase 4
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-3">
        {behaviors.map(({ icon: Icon, label, color, desc }) => (
          <SectionCard key={label} className="p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color.split(" ")[1]}`}>
              <Icon size={16} className={color.split(" ")[0]} />
            </div>
            <div>
              <p className="text-sm font-semibold text-dm">{label} Triggers</p>
              <p className="text-xs text-dm">{desc}</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-dm glass-sub px-2.5 py-1 rounded-full border border-glass">
              <Lock size={9} /> Locked
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

// ─── Actions Section ──────────────────────────────────────────────────────────
function ActionsSection({ data }: { data: BehaviorData }) {
  if (data.empty) {
    return (
      <SectionCard className="p-12 text-center">
        <Zap size={32} className="text-gray-200 mx-auto mb-3" />
        <p className="text-ds font-semibold">No actions yet</p>
        <p className="text-sm text-dm mt-1">Run the pipeline to analyze competitor patterns and generate actions.</p>
      </SectionCard>
    );
  }

  const actions = computeActions(data);
  const impactColor = (impact: string) =>
    impact === "High"   ? "text-rose-500 bg-rose-50 border-rose-100" :
    impact === "Medium" ? "text-amber-500 bg-amber-50 border-amber-100" :
                          "text-blue-500 bg-blue-50 border-blue-100";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-dh">Behavior Actions</h2>
          <p className="text-xs text-dm mt-0.5">Ranked by expected impact · based on {data.summary.totalAnalyses} analyzed posts</p>
        </div>
      </div>

      {actions.map((action, i) => (
        <SectionCard key={i} className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-7 h-7 glass-sub rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-ds">{i + 1}</span>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${impactColor(action.impact)}`}>
                  {action.impact} Impact
                </span>
              </div>
              <p className="text-sm font-bold text-dh">{action.title}</p>
              <p className="text-xs text-ds leading-relaxed">{action.reason}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-dm glass-sub rounded-lg px-3 py-1.5 w-fit">
                <ArrowUpRight size={11} className="text-emerald-400" />
                {action.expected}
              </div>
            </div>
          </div>
        </SectionCard>
      ))}

      <SectionCard className="p-5 border-dashed">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center">
            <Sparkles size={14} className="text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-dp">AI-Powered Deep Actions</p>
            <p className="text-xs text-dm">GPT-4o synthesis of all pattern data into a weekly action plan</p>
          </div>
          <div className="ml-auto">
            <span className="text-[10px] font-bold text-dm glass-sub border border-glass px-2.5 py-1 rounded-full">
              Coming in Phase 5
            </span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Learning Log Section ─────────────────────────────────────────────────────
function LearningLogSection({ data }: { data: BehaviorData }) {
  // Derive basic "learnings" from the data we have
  const learnings = [];

  if (!data.empty) {
    const topHook = data.hookDistribution[0];
    const topTone = [...data.toneDistribution].sort((a, b) => b.avgScore - a.avgScore)[0];
    if (topHook) {
      learnings.push({
        date: "Today",
        type: "Pattern detected",
        description: `${topHook.hook} is the dominant hook type across competitor posts (${topHook.count} uses, ${topHook.avgScore}/10 avg). Flagged as primary signal.`,
      });
    }
    if (topTone) {
      learnings.push({
        date: "Today",
        type: "Score pattern",
        description: `${topTone.tone} tone scores highest (${topTone.avgScore}/10 avg) across ${topTone.count} competitor posts. Weighting this pattern in action recommendations.`,
      });
    }
    if (data.sources.length > 0) {
      const top = data.sources[0];
      learnings.push({
        date: "Today",
        type: "Competitor learned",
        description: `${top.name} identified as most-analyzed competitor (${top.postCount} posts). Their formula: ${top.topHook} + ${top.topTone}. Avg score: ${top.avgScore}/10.`,
      });
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard>
        <div className="p-5 border-b border-glass-soft flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center">
            <Brain size={15} className="text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-dh">Learning Log</p>
            <p className="text-xs text-dm">Every insight the engine has confirmed</p>
          </div>
        </div>

        {learnings.length > 0 ? (
          <div className="divide-y divide-glass">
            {learnings.map((log, i) => (
              <div key={i} className="p-5 flex gap-4">
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-2 shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full">{log.type}</span>
                    <span className="text-[10px] text-dm">{log.date}</span>
                  </div>
                  <p className="text-xs text-ds leading-relaxed">{log.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <BookOpen size={28} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-dm">Run the pipeline to start building the learning log.</p>
          </div>
        )}
      </SectionCard>

      <SectionCard className="p-5 border-dashed">
        <p className="text-xs font-bold text-ds mb-3">Adaptive Learning Engine (Phase 5)</p>
        <p className="text-xs text-dm leading-relaxed mb-3">
          The full learning engine will track pattern weights over time — adjusting recommendations
          as more data confirms or contradicts each pattern. Every hook type, tone, and timing
          pattern gets a confidence score that grows with evidence.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            "Pattern weight system (1.0 → 1.6 as confirmed)",
            "Daily learning cycle at 6am",
            "Auto-update recommendation weights",
            "Contradiction detection & reversal",
          ].map(item => (
            <div key={item} className="flex items-start gap-1.5">
              <div className="w-1.5 h-1.5 bg-gray-200 rounded-full mt-1.5 shrink-0" />
              <p className="text-[11px] text-dm">{item}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

const SECTION_META: Record<Section, { title: string; subtitle: (d: BehaviorData) => string }> = {
  "overview":    { title: "Daily Brief",          subtitle: () => "Your content, competitors, and audience — all in one view." },
  "my-content":  { title: "My Content",           subtitle: () => "Deep analysis of your own posting history and performance." },
  "competitors": { title: "Competitor Behavior",  subtitle: (d) => `${d.summary.totalAnalyses} posts analyzed across ${d.summary.totalSources} competitors.${d.summary.lastUpdated ? ` Updated ${timeAgo(d.summary.lastUpdated)}.` : ""}` },
  "audience":    { title: "Audience Behavior",    subtitle: () => "How your audience actually behaves — not just demographics." },
  "actions":     { title: "Behavior Actions",     subtitle: (d) => `Ranked actions synthesized from ${d.summary.totalAnalyses} analyzed competitor posts.` },
  "learning":    { title: "Learning Log",         subtitle: () => "Every pattern the engine has detected and confirmed." },
};

// ─── Main Page ────────────────────────────────────────────────────────────────
function BehaviorPageContent() {
  const searchParams  = useSearchParams();
  const section       = (searchParams.get("section") ?? "overview") as Section;
  const [data, setData]       = useState<BehaviorData | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/behavior", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const empty: BehaviorData = {
    empty: true,
    summary: { totalAnalyses: 0, totalSources: 0, avgScore: 0, lastUpdated: null },
    hookDistribution: [], toneDistribution: [], ctaDistribution: [], sources: [], topPosts: [], bottomPosts: [],
  };
  const d = data ?? empty;
  const meta = SECTION_META[section] ?? SECTION_META["overview"];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-dm mb-1">
            <Brain size={11} className="text-violet-400" />
            <span className="text-violet-500 font-medium">Intelligence</span>
            <ChevronRight size={11} />
            <span className="text-ds font-medium">{meta.title}</span>
          </div>
          <h1 className="text-xl font-bold text-dh">{meta.title}</h1>
          <p className="text-sm text-dm mt-0.5">{meta.subtitle(d)}</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-dm hover:text-ds transition px-3 py-1.5 rounded-lg border border-glass hover:glass-sub"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 glass-sub rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Section content */}
      {!loading && section === "overview"    && <OverviewSection    data={d} />}
      {!loading && section === "my-content"  && <MyContentSection />}
      {!loading && section === "competitors" && <CompetitorsSection data={d} />}
      {!loading && section === "audience"    && <AudienceSection />}
      {!loading && section === "actions"     && <ActionsSection     data={d} />}
      {!loading && section === "learning"    && <LearningLogSection data={d} />}
    </div>
  );
}

export default function BehaviorPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh]" />}>
      <BehaviorPageContent />
    </Suspense>
  );
}
