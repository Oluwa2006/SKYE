"use client";

import { useState, useEffect } from "react";
import { useUser } from "./UserContext";

interface Analysis { id: string; score?: number; created_at?: string; post?: { source?: { name?: string } } }
interface Idea     { id: string; status?: string; headline?: string; created_at?: string }
interface Source   { id: string; name: string; created_at?: string }
interface Post     { id: string; created_at?: string }

function fmt(n: number) { return n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n); }
function timeAgo(iso: string) {
  const d = Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if (d<60) return `${d}s ago`;
  if (d<3600) return `${Math.floor(d/60)}m ago`;
  if (d<86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}

function GlassCard({ children, className="" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl ${className}`} style={{
      background: "rgba(255,255,255,0.65)",
      backdropFilter: "blur(20px) saturate(1.8)",
      WebkitBackdropFilter: "blur(20px) saturate(1.8)",
      border: "1px solid rgba(255,255,255,0.75)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)",
    }}>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const user = useUser();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [ideas,    setIdeas]    = useState<Idea[]>([]);
  const [sources,  setSources]  = useState<Source[]>([]);
  const [posts,    setPosts]    = useState<Post[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/analysis").then(r=>r.json()).catch(()=>({})),
      fetch("/api/ideas").then(r=>r.json()).catch(()=>({})),
      fetch("/api/sources").then(r=>r.json()).catch(()=>({})),
      fetch("/api/posts").then(r=>r.json()).catch(()=>({})),
    ]).then(([a,i,s,p]) => {
      setAnalyses(a?.analysis??[]);
      setIdeas(i?.ideas??[]);
      setSources(s?.sources??[]);
      setPosts(p?.posts??[]);
      setLoading(false);
    });
  }, []);

  const today    = new Date().toISOString().split("T")[0];
  const todayAna = analyses.filter(a=>a.created_at?.startsWith(today)).length;
  const approved = ideas.filter(i=>i.status==="approved").length;
  const avgScore = analyses.length > 0
    ? (analyses.reduce((s,a)=>s+(a.score??0),0)/analyses.length).toFixed(1)
    : null;

  const hour = new Date().getHours();
  const greeting = hour<12 ? "Good morning" : hour<17 ? "Good afternoon" : "Good evening";
  const name  = user?.display_name?.split(" ")[0] ?? "";

  const recent = [...analyses]
    .sort((a,b)=>new Date(b.created_at??0).getTime()-new Date(a.created_at??0).getTime())
    .slice(0,5);

  const STATS = [
    { label:"Analyses",   value: loading?"—":fmt(analyses.length), sub: todayAna>0?`+${todayAna} today`:null,  color:"#007AFF" },
    { label:"Posts",      value: loading?"—":fmt(posts.length),     sub: null,                                  color:"#5856D6" },
    { label:"Ideas",      value: loading?"—":fmt(ideas.length),     sub: approved>0?`${approved} approved`:null, color:"#34C759" },
    { label:"Competitors",value: loading?"—":String(sources.length),sub: null,                                  color:"#FF9500" },
    { label:"Avg Score",  value: loading?"—":avgScore?`${avgScore}/10`:"—", sub:null,                          color:"#FF2D55" },
  ];

  return (
    <div className="min-h-screen px-8 py-10 max-w-3xl">

      {/* Greeting */}
      <div className="mb-10">
        <p className="text-sm text-gray-400 font-medium mb-1">
          {new Date().toLocaleDateString("en-US",{ weekday:"long", month:"long", day:"numeric" })}
        </p>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">
          {greeting}{name ? `, ${name}` : ""}.
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-10">
        {STATS.map(({ label, value, sub, color }) => (
          <GlassCard key={label} className="px-4 py-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
            <p className="text-2xl font-black leading-none" style={{ color }}>{value}</p>
            {sub && <p className="text-[10px] text-gray-400 mt-1.5 font-medium">{sub}</p>}
          </GlassCard>
        ))}
      </div>

      {/* Recent activity */}
      {!loading && recent.length > 0 && (
        <GlassCard>
          <div className="px-5 py-4 border-b" style={{ borderColor:"rgba(0,0,0,0.05)" }}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recent Activity</p>
          </div>
          <div className="divide-y" style={{ borderColor:"rgba(0,0,0,0.04)" }}>
            {recent.map(a => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background:"#007AFF" }} />
                  <p className="text-sm text-gray-700 font-medium truncate max-w-xs">
                    {a.post?.source?.name ?? "Analysis"} analysed
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {a.score != null && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background:a.score>=7?"#dcfce7":a.score>=5?"#fef9c3":"#f3f4f6",
                               color:a.score>=7?"#15803d":a.score>=5?"#92400e":"#6b7280" }}>
                      {a.score}/10
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400">{a.created_at?timeAgo(a.created_at):""}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {!loading && recent.length === 0 && (
        <GlassCard className="px-6 py-12 text-center">
          <p className="text-sm font-semibold text-gray-400">No activity yet — run the pipeline to get started.</p>
        </GlassCard>
      )}

    </div>
  );
}
