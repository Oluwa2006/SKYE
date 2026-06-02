"use client";

import { useState, useEffect } from "react";
import { useUser } from "./UserContext";

interface Analysis { id: string; score?: number; created_at?: string; hook_type?: string; tone?: string; post?: { source?: { name?: string } } }
interface Idea     { id: string; status?: string; headline?: string; created_at?: string }
interface Source   { id: string; name: string; created_at?: string }
interface Post     { id: string; created_at?: string }

function fmt(n: number) { return n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n); }
function timeAgo(iso: string) {
  const d = Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if (d<60) return `${d}s ago`; if (d<3600) return `${Math.floor(d/60)}m ago`;
  if (d<86400) return `${Math.floor(d/3600)}h ago`; return `${Math.floor(d/86400)}d ago`;
}

// ─── Glass card shell ─────────────────────────────────────────────────────────
function Card({ children, className="", style={} }: { children:React.ReactNode; className?:string; style?:React.CSSProperties }) {
  return (
    <div className={`rounded-2xl overflow-hidden ${className}`} style={{
      background:"rgba(255,255,255,0.62)",
      backdropFilter:"blur(24px) saturate(1.8)",
      WebkitBackdropFilter:"blur(24px) saturate(1.8)",
      border:"1px solid rgba(255,255,255,0.8)",
      boxShadow:"0 4px 24px rgba(37,99,235,0.07), inset 0 1px 0 rgba(255,255,255,0.95)",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Bar chart (SVG) ──────────────────────────────────────────────────────────
function BarChart({ data }: { data: { label:string; value:number; value2?:number }[] }) {
  const max = Math.max(...data.map(d=>Math.max(d.value, d.value2??0)), 1);
  return (
    <div className="flex items-end gap-1.5 h-28 w-full">
      {data.map((d,i)=>(
        <div key={i} className="flex-1 flex items-end gap-0.5">
          <div className="flex-1 rounded-t-lg transition-all" style={{ height:`${(d.value/max)*100}%`, background:"#2563eb", minHeight:4, opacity:0.9 }} />
          {d.value2!=null && <div className="flex-1 rounded-t-lg" style={{ height:`${(d.value2/max)*100}%`, background:"#bfdbfe", minHeight:4 }} />}
        </div>
      ))}
    </div>
  );
}

// ─── Sparkline (SVG) ─────────────────────────────────────────────────────────
function Sparkline({ values, color="#2563eb" }: { values:number[]; color?:string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max-min || 1;
  const w=200, h=52;
  const pts = values.map((v,i)=>({
    x: (i/(values.length-1))*w,
    y: h - ((v-min)/range)*(h-8) - 4,
  }));
  const path = pts.map((p,i)=>`${i===0?"M":"L"}${p.x},${p.y}`).join(" ");
  const fill = pts.map((p,i)=>`${i===0?"M":"L"}${p.x},${p.y}`).join(" ") + ` L${pts[pts.length-1].x},${h} L${pts[0].x},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.01"/>
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#sg)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Mini donut ───────────────────────────────────────────────────────────────
function Donut({ pct }: { pct: number }) {
  const r=22, c=2*Math.PI*r, dash=c*(pct/100);
  return (
    <svg width="64" height="64" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#dbeafe" strokeWidth="6" />
      <circle cx="28" cy="28" r={r} fill="none" stroke="#2563eb" strokeWidth="6"
        strokeDasharray={`${dash} ${c}`} strokeDashoffset={c/4}
        strokeLinecap="round" transform="rotate(-90 28 28)" />
      <text x="28" y="33" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1e40af">{pct}%</text>
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
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
    ]).then(([a,i,s,p])=>{
      setAnalyses(a?.analysis??[]); setIdeas(i?.ideas??[]);
      setSources(s?.sources??[]); setPosts(p?.posts??[]);
      setLoading(false);
    });
  }, []);

  const today    = new Date().toISOString().split("T")[0];
  const todayAna = analyses.filter(a=>a.created_at?.startsWith(today)).length;
  const approved = ideas.filter(i=>i.status==="approved").length;
  const avgScore = analyses.length>0 ? Math.round(analyses.reduce((s,a)=>s+(a.score??0),0)/analyses.length*10)/10 : 0;
  const coverage = posts.length>0 ? Math.min(Math.round((analyses.length/posts.length)*100),100) : 0;

  const name = user?.display_name?.split(" ")[0] ?? "";
  const hour = new Date().getHours();
  const greeting = hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";

  // Weekly bar data
  const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const now=new Date(); const dow=now.getDay();
  const weekBars = days.map((_,i)=>{
    const target=(i+1)%7; const dt=new Date(now);
    dt.setDate(now.getDate()-((dow-target+7)%7));
    const key=dt.toISOString().split("T")[0];
    const ana=analyses.filter(a=>a.created_at?.startsWith(key)).length;
    const pst=posts.filter(p=>p.created_at?.startsWith(key)).length;
    return { label:days[i], value:ana, value2:pst };
  });

  // Sparkline — last 14 days
  const sparkValues = Array.from({length:14},(_,i)=>{
    const dt=new Date(now); dt.setDate(now.getDate()-(13-i));
    return analyses.filter(a=>a.created_at?.startsWith(dt.toISOString().split("T")[0])).length;
  });

  const recent = [...analyses]
    .sort((a,b)=>new Date(b.created_at??0).getTime()-new Date(a.created_at??0).getTime())
    .slice(0,6);

  // Top sources
  const srcCounts: Record<string,number>={};
  for (const a of analyses) { const n=a.post?.source?.name??"Unknown"; srcCounts[n]=(srcCounts[n]??0)+1; }
  const topSrc = Object.entries(srcCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);

  return (
    <div className="p-6 min-h-screen">

      {/* ── Greeting ── */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          Welcome back{name?` ${name}`:""}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
        </p>
      </div>

      {/* ── Mosaic grid ── */}
      <div className="grid gap-3" style={{
        gridTemplateColumns:"repeat(12,1fr)",
        gridTemplateRows:"auto",
      }}>

        {/* ── Total analyses — big stat ── */}
        <div style={{ gridColumn:"1/5" }}>
          <Card className="p-5 h-full">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Total Analyses</p>
            <p className="text-5xl font-black text-gray-900 leading-none mb-1">{loading?"—":fmt(analyses.length)}</p>
            <p className="text-xs text-blue-500 font-semibold mt-1">{todayAna>0?`+${todayAna} today`:"No runs today"}</p>
            <div className="mt-3">
              <Sparkline values={sparkValues.length>1?sparkValues:[0,0]} />
            </div>
          </Card>
        </div>

        {/* ── Coverage goal ── */}
        <div style={{ gridColumn:"5/8" }}>
          <Card className="p-5 h-full flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Analysis Coverage</p>
              <p className="text-4xl font-black text-gray-900 leading-none">{loading?"—":`${coverage}%`}</p>
              <p className="text-xs text-gray-400 mt-1">of posts analysed</p>
            </div>
            <div className="flex items-center justify-between mt-3">
              <Donut pct={loading?0:coverage} />
              <div className="text-right">
                <p className="text-xs text-gray-400">Posts</p>
                <p className="text-lg font-black text-gray-900">{loading?"—":fmt(posts.length)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Weekly activity chart — spans 2 rows ── */}
        <div style={{ gridColumn:"8/13", gridRow:"1/3" }}>
          <Card className="p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Weekly Activity</p>
              <div className="flex items-center gap-3 text-[10px] font-semibold">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-blue-600"/>Analyses</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block bg-blue-200"/>Posts</span>
              </div>
            </div>
            <BarChart data={weekBars} />
            <div className="flex mt-1.5">
              {days.map(d=><p key={d} className="flex-1 text-center text-[9px] text-gray-400">{d}</p>)}
            </div>
            {/* Summary row */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4" style={{ borderTop:"1px solid rgba(0,0,0,0.06)" }}>
              <div className="rounded-xl p-3" style={{ background:"rgba(37,99,235,0.06)" }}>
                <p className="text-[9px] text-blue-400 font-semibold uppercase tracking-widest">Avg Score</p>
                <p className="text-xl font-black text-gray-900 mt-0.5">{loading?"—":avgScore>0?`${avgScore}/10`:"—"}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background:"rgba(37,99,235,0.06)" }}>
                <p className="text-[9px] text-blue-400 font-semibold uppercase tracking-widest">Competitors</p>
                <p className="text-xl font-black text-gray-900 mt-0.5">{loading?"—":sources.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Next run + ideas row ── */}
        <div style={{ gridColumn:"1/4" }}>
          <Card className="p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Ideas Generated</p>
            <p className="text-4xl font-black text-gray-900 leading-none">{loading?"—":fmt(ideas.length)}</p>
            <p className="text-xs text-green-500 font-semibold mt-1">{approved} approved</p>
          </Card>
        </div>

        <div style={{ gridColumn:"4/5" }}>
          <Card className="p-4 flex flex-col items-center justify-center text-center h-full">
            <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-widest mb-1">Sources</p>
            <p className="text-3xl font-black text-blue-600">{loading?"—":sources.length}</p>
          </Card>
        </div>

        <div style={{ gridColumn:"5/8" }}>
          <Card className="p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Top Source</p>
            {loading || topSrc.length===0 ? (
              <p className="text-sm text-gray-400">No data yet</p>
            ) : (
              <>
                <p className="text-base font-black text-gray-900 truncate">{topSrc[0][0]}</p>
                <p className="text-xs text-blue-500 font-semibold mt-0.5">{topSrc[0][1]} analyses</p>
              </>
            )}
          </Card>
        </div>

        {/* ── Recent activity table ── */}
        <div style={{ gridColumn:"1/8" }}>
          <Card>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom:"1px solid rgba(0,0,0,0.05)" }}>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Recent Activity</p>
              <div className="grid grid-cols-5 flex-1 ml-8 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                <span>Source</span><span>Date</span><span>Hook</span><span>Tone</span><span className="text-right">Score</span>
              </div>
            </div>
            {loading ? (
              <div className="p-4 space-y-2">
                {[1,2,3,4].map(i=><div key={i} className="h-9 rounded-xl animate-pulse" style={{ background:"rgba(37,99,235,0.06)" }}/>)}
              </div>
            ) : recent.length===0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No analyses yet</p>
            ) : (
              <div className="divide-y" style={{ borderColor:"rgba(0,0,0,0.04)" }}>
                {recent.map(a=>(
                  <div key={a.id} className="grid grid-cols-5 items-center px-5 py-3 hover:bg-blue-50/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-white text-[9px] font-black"
                        style={{ background:"linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                        {(a.post?.source?.name??"?")[0].toUpperCase()}
                      </div>
                      <span className="text-[11px] font-semibold text-gray-800 truncate">{a.post?.source?.name??"Unknown"}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{a.created_at?timeAgo(a.created_at):""}</span>
                    <span className="text-[10px] text-gray-500 capitalize truncate">{a.hook_type??"—"}</span>
                    <span className="text-[10px] text-gray-500 capitalize truncate">{a.tone??"—"}</span>
                    <div className="flex justify-end">
                      {a.score!=null?(
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background:a.score>=7?"#dbeafe":a.score>=5?"#fef9c3":"#f3f4f6",
                                   color:a.score>=7?"#1d4ed8":a.score>=5?"#92400e":"#6b7280" }}>
                          {a.score}/10
                        </span>
                      ):<span className="text-[10px] text-gray-300">—</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Source breakdown ── */}
        <div style={{ gridColumn:"8/13" }}>
          <Card className="p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Source Breakdown</p>
            {loading || topSrc.length===0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No data yet</p>
            ) : (
              <div className="space-y-3">
                {topSrc.map(([name,count])=>{
                  const max=topSrc[0][1];
                  const pct=Math.round((count/max)*100);
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[130px]">{name}</span>
                        <span className="text-[10px] font-bold text-blue-500">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"#dbeafe" }}>
                        <div className="h-full rounded-full" style={{ width:`${pct}%`, background:"linear-gradient(90deg,#2563eb,#7c3aed)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
