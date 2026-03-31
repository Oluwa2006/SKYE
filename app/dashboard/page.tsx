"use client";

import type { CSSProperties } from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp, TrendingDown, BarChart2,
  Layers, Lightbulb, Zap, ChevronRight, Clock,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
interface Source   { id: string; name: string; niche?: string; platform?: string }
interface Post     { id: string; source_id?: string; traction_score?: number; hook?: string; caption?: string; created_at?: string }
interface Analysis { id: string; score?: number; tone?: string; hook_type?: string; cta_type?: string; topic?: string; created_at?: string; post?: { source?: { name?: string } } }
interface Idea     { id: string; status?: string; date_generated?: string; content_pillar?: string; headline?: string; created_at?: string }

// ─── Glass token ───────────────────────────────────────────────────────────
const G = {
  bg:        "rgba(255,255,255,0.88)",
  bgDeep:    "rgba(255,255,255,0.96)",
  bgSub:     "rgba(247,247,247,0.95)",
  border:    "1px solid rgba(16,16,16,0.08)",
  borderSub: "1px solid rgba(16,16,16,0.06)",
  blur:      "blur(0px)",
  shadow:    "0 14px 30px rgba(0,0,0,0.06)",
  // text
  h:   "#111111",
  p:   "rgba(17,17,17,0.76)",
  s:   "rgba(17,17,17,0.52)",
  m:   "rgba(17,17,17,0.34)",
  blue:    "#111111",
  violet:  "#111111",
  teal:    "#111111",
  rose:    "#111111",
  amber:   "#111111",
} as const;

function glass(extra?: CSSProperties): CSSProperties {
  return {
    background: G.bg,
    border: G.border,
    boxShadow: G.shadow,
    ...extra,
  };
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, trend, trendLabel, color,
}: {
  icon: React.ReactNode;
  label: string; value: string | number; sub?: string;
  trend?: "up" | "down" | "neutral"; trendLabel?: string; color: string;
}) {
  return (
    <div className="rounded-2xl px-5 py-4 flex items-center gap-4 relative overflow-hidden"
      style={glass()}>
      {/* soft color wash */}
      <div style={{ position: "absolute", top: -24, right: -24, width: 90, height: 90, borderRadius: "50%",
        background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-0.5"
          style={{ color: G.m, fontFamily: "var(--font-dm-sans)" }}>{label}</p>
        <p className="text-[26px] font-bold leading-tight"
          style={{ color, fontFamily: "var(--font-josefin)" }}>{value}</p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: G.s }}>{sub}</p>}
      </div>
      {trendLabel && (
        <div className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg shrink-0"
          style={{
            background: trend === "up" ? "rgba(42,138,120,0.12)" : trend === "down" ? "rgba(192,64,90,0.1)" : "rgba(0,0,0,0.05)",
            color:      trend === "up" ? G.teal               : trend === "down" ? G.rose              : G.m,
          }}>
          {trend === "up" ? <TrendingUp size={10} /> : trend === "down" ? <TrendingDown size={10} /> : null}
          {trendLabel}
        </div>
      )}
    </div>
  );
}

// ─── Bar chart ─────────────────────────────────────────────────────────────
function BarChart({ data, color = "#6b52c8" }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-28 w-full">
      {data.map((d, i) => {
        const pct   = Math.max((d.value / max) * 100, d.value > 0 ? 6 : 0);
        const isMax = d.value === max && d.value > 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
            {d.value > 0 && (
              <span className="text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition"
                style={{ color }}>{d.value}</span>
            )}
            <div className="w-full rounded-t-md transition-all" style={{
              height: `${pct}%`,
              background: isMax
                ? `linear-gradient(to top, ${color}88, ${color}dd)`
                : `linear-gradient(to top, ${color}28, ${color}55)`,
              minHeight: d.value > 0 ? "6px" : "0px",
              boxShadow: isMax ? `0 0 10px ${color}40` : "none",
            }} />
            <p className="text-[9px] font-medium truncate w-full text-center"
              style={{ color: G.m, fontFamily: "var(--font-dm-sans)" }}>{d.label}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [sources,  setSources]  = useState<Source[]>([]);
  const [posts,    setPosts]    = useState<Post[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [ideas,    setIdeas]    = useState<Idea[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/sources").then(r => r.json()).catch(() => ({})),
      fetch("/api/posts").then(r => r.json()).catch(() => ({})),
      fetch("/api/analysis").then(r => r.json()).catch(() => ({})),
      fetch("/api/ideas").then(r => r.json()).catch(() => ({})),
    ]).then(([s, p, a, i]) => {
      setSources(s?.sources ?? []);
      setPosts(p?.posts ?? []);
      setAnalyses(a?.analysis ?? []);
      setIdeas(i?.ideas ?? []);
      setLoading(false);
    });
  }, []);

  const today         = new Date().toISOString().split("T")[0];
  const todayAnalyses = analyses.filter(a => a.created_at?.startsWith(today)).length;
  const todayIdeas    = ideas.filter(i => i.date_generated === today || i.created_at?.startsWith(today)).length;
  const approvedIdeas = ideas.filter(i => i.status === "approved").length;
  const avgScore      = analyses.length > 0
    ? parseFloat((analyses.reduce((s, a) => s + (a.score ?? 0), 0) / analyses.length).toFixed(1))
    : 0;

  const analysesBySource: Record<string, number> = {};
  for (const a of analyses) {
    const name = a.post?.source?.name ?? "Unknown";
    analysesBySource[name] = (analysesBySource[name] || 0) + 1;
  }
  const chartData = Object.entries(analysesBySource)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([label, value]) => ({ label: label.split(" ")[0], value }));
  const barData = chartData.length > 0
    ? chartData
    : sources.slice(0, 8).map(s => ({ label: s.name.split(" ")[0], value: 0 }));

  const recentAnalyses = [...analyses]
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, 8);

  const topSourceEntry = Object.entries(analysesBySource).sort((a, b) => b[1] - a[1])[0];
  const topSource      = topSourceEntry?.[0] ?? null;
  const dateLabel      = new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="flex flex-col min-h-screen p-6 gap-5">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight"
          style={{ color: G.h, fontFamily: "var(--font-josefin)" }}>Dashboard</h1>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
          style={glass({ boxShadow: "none" })}>
          <Clock size={13} style={{ color: G.m }} />
          <span style={{ color: G.s }}>{dateLabel}</span>
        </div>
      </div>

      {/* ── Stat cards + chart + summary ────────────────────────────── */}
      <div className="grid grid-cols-12 gap-4">

        {/* Stat cards */}
        <div className="col-span-3 flex flex-col gap-3">
          <StatCard icon={<Layers size={18} />}   label="Posts Scraped"    value={loading ? "—" : fmt(posts.length)}
            sub="Total collected" trend="up" trendLabel={`+${todayAnalyses} today`} color={G.blue} />
          <StatCard icon={<BarChart2 size={18} />} label="Analyses Run"     value={loading ? "—" : fmt(analyses.length)}
            sub="Content scored" trend={avgScore >= 6 ? "up" : "neutral"} trendLabel={`${avgScore}/10 avg`} color={G.violet} />
          <StatCard icon={<Lightbulb size={18} />} label="Ideas Generated"  value={loading ? "—" : fmt(ideas.length)}
            sub={`${approvedIdeas} approved`} trend={todayIdeas > 0 ? "up" : "neutral"} trendLabel={`+${todayIdeas} today`} color={G.teal} />
        </div>

        {/* Bar chart */}
        <div className="col-span-6 rounded-2xl p-5 flex flex-col" style={glass()}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold" style={{ color: G.h, fontFamily: "var(--font-josefin)" }}>Content Analytics</p>
              <p className="text-[11px] mt-0.5" style={{ color: G.s }}>Analyses per competitor source</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: G.violet }} />
              <span style={{ color: G.s }}>Analyses</span>
            </div>
          </div>
          {loading ? (
            <div className="flex items-end gap-1.5 h-28">
              {[60,45,80,30,70,55,40,65].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md animate-pulse"
                  style={{ height: `${h}%`, background: "rgba(100,80,200,0.12)" }} />
              ))}
            </div>
          ) : (
            <BarChart data={barData.length > 0 ? barData : [{ label: "No data", value: 0 }]} />
          )}
        </div>

        {/* Summary panel */}
        <div className="col-span-3 rounded-2xl p-5 flex flex-col gap-3" style={glass()}>
          <p className="text-sm font-bold" style={{ color: G.h, fontFamily: "var(--font-josefin)" }}>Intelligence Summary</p>

          <div className="rounded-xl px-4 py-3" style={{ background: G.bgSub, border: G.borderSub }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: G.m }}>Top Source</p>
            <p className="text-sm font-bold truncate" style={{ color: G.h }}>{topSource ?? "—"}</p>
            {topSourceEntry && (
              <p className="text-[11px] font-medium mt-0.5" style={{ color: G.violet }}>{topSourceEntry[1]} analyses</p>
            )}
          </div>

          <div className="rounded-xl px-4 py-3" style={{ background: G.bgSub, border: G.borderSub }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: G.m }}>Avg Content Score</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold" style={{ color: G.h, fontFamily: "var(--font-josefin)" }}>{avgScore > 0 ? avgScore : "—"}</p>
              {avgScore > 0 && <span className="text-[11px]" style={{ color: G.m }}>/10</span>}
            </div>
            {avgScore > 0 && (
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
                <div className="h-full rounded-full transition-all" style={{
                  width: `${(avgScore / 10) * 100}%`,
                  background: avgScore >= 7 ? G.teal : avgScore >= 5 ? G.amber : G.rose,
                }} />
              </div>
            )}
          </div>

          <div className="rounded-xl px-4 py-3" style={{ background: G.bgSub, border: G.borderSub }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: G.m }}>Competitors Tracked</p>
            <p className="text-2xl font-bold" style={{ color: G.h, fontFamily: "var(--font-josefin)" }}>{loading ? "—" : sources.length}</p>
          </div>
        </div>
      </div>

      {/* ── Activity table ───────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={glass({ padding: 0 })}>
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.4)" }}>
          <div>
            <p className="text-sm font-bold" style={{ color: G.h, fontFamily: "var(--font-josefin)" }}>Activity Data</p>
            <p className="text-[11px] mt-0.5" style={{ color: G.s }}>Recent content analyses</p>
          </div>
          <button onClick={() => router.push("/dashboard/analysis")}
            className="flex items-center gap-1 text-[11px] font-semibold transition"
            style={{ color: G.violet }}>
            View Intelligence <ChevronRight size={12} />
          </button>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-10 rounded-xl animate-pulse"
                style={{ background: "rgba(100,80,200,0.08)" }} />
            ))}
          </div>
        ) : recentAnalyses.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Zap size={24} className="mx-auto mb-3" style={{ color: G.m }} />
            <p className="text-sm font-medium" style={{ color: G.s }}>No analyses yet</p>
            <p className="text-xs mt-1" style={{ color: G.m }}>Run the pipeline to start generating insights</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.12)" }}>
                {["Source","Date","Hook Type","Tone","Topic","Score"].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-widest px-5 py-2.5"
                    style={{ color: G.m, paddingLeft: h === "Source" ? "20px" : "16px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentAnalyses.map(a => {
                const sourceName = a.post?.source?.name ?? "—";
                const date = a.created_at
                  ? new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "—";
                return (
                  <tr key={a.id} className="transition-colors"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.2)" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                    <td className="px-5 py-3 text-sm font-semibold" style={{ color: G.h }}>{sourceName}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: G.s }}>{date}</td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg capitalize"
                        style={{ background: "rgba(107,82,200,0.12)", color: G.violet }}>{a.hook_type ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg capitalize"
                        style={{ background: "rgba(58,127,193,0.12)", color: G.blue }}>{a.tone ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[180px] truncate" style={{ color: G.s }}>{a.topic ?? "—"}</td>
                    <td className="px-4 py-3">
                      {a.score != null ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg" style={{
                          background: a.score >= 8 ? "rgba(42,138,120,0.12)" : a.score >= 5 ? "rgba(176,120,32,0.1)" : "rgba(0,0,0,0.06)",
                          color: a.score >= 8 ? G.teal : a.score >= 5 ? G.amber : G.m,
                        }}>{a.score}/10</span>
                      ) : <span className="text-xs" style={{ color: G.m }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {recentAnalyses.length > 0 && (
          <div className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(255,255,255,0.35)" }}>
            <p className="text-[11px]" style={{ color: G.s }}>
              Showing {recentAnalyses.length} of {analyses.length} analyses
            </p>
            <button onClick={() => router.push("/dashboard/analysis")}
              className="text-[11px] font-semibold flex items-center gap-1 transition"
              style={{ color: G.violet }}>
              View all <ChevronRight size={11} />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
