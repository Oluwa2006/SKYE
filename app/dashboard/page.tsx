"use client";

import { useState, useEffect } from "react";
import { useUser } from "./UserContext";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  MagnifyingGlass, Bell, FunnelSimple,
  CaretRight, CaretLeft, ArrowUpRight,
  TrendUp, Lightbulb, ChartBar, Users,
} from "@phosphor-icons/react";

interface Analysis { id:string; score?:number; created_at?:string; hook_type?:string; tone?:string; post?:{source?:{name?:string}} }
interface Idea     { id:string; status?:string; headline?:string; created_at?:string }
interface Source   { id:string; name:string; created_at?:string }
interface Post     { id:string; created_at?:string }

function fmt(n:number){ return n>=1000?`${(n/1000).toFixed(1)}K`:String(n); }
function shortDate(iso:string){
  return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"2-digit",year:"numeric"});
}
function timeAgo(iso:string){
  const d=Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if(d<60) return `${d}s ago`; if(d<3600) return `${Math.floor(d/60)}m ago`;
  if(d<86400) return `${Math.floor(d/3600)}h ago`; return `${Math.floor(d/86400)}d ago`;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?:boolean; payload?:{value:number}[]; label?:string }) {
  if(!active||!payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs font-semibold shadow-lg"
      style={{ background:"#111827", color:"#fff", border:"none" }}>
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className="text-white font-bold">{payload[0].value} analyses</p>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon:Icon, label, value, delta, color, sparkData }:{
  icon:React.ElementType; label:string; value:string;
  delta?:string; color:string; sparkData:{v:number}[];
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100"
      style={{ boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background:`${color}15` }}>
          <Icon size={16} weight="duotone" style={{ color }} />
        </div>
        {delta && (
          <span className="flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background:`${color}12`, color }}>
            <ArrowUpRight size={10}/>{delta}
          </span>
        )}
      </div>
      <p className="text-[11px] font-medium text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-black text-gray-900 leading-none mb-3">{value}</p>
      <ResponsiveContainer width="100%" height={40}>
        <AreaChart data={sparkData} margin={{top:0,right:0,left:0,bottom:0}}>
          <defs>
            <linearGradient id={`sg-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2}/>
              <stop offset="100%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
            fill={`url(#sg-${label})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const user   = useUser();
  const router = useRouter();

  const [analyses,setAnalyses] = useState<Analysis[]>([]);
  const [ideas,   setIdeas]    = useState<Idea[]>([]);
  const [sources, setSources]  = useState<Source[]>([]);
  const [posts,   setPosts]    = useState<Post[]>([]);
  const [loading, setLoading]  = useState(true);
  const [page,    setPage]     = useState(1);
  const PER_PAGE = 8;

  useEffect(()=>{
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
  },[]);

  const hour = new Date().getHours();
  const timeOfDay = hour<12?"Morning":hour<17?"Afternoon":"Evening";
  const firstName = user?.display_name?.split(" ")[0]??"";

  const today    = new Date().toISOString().split("T")[0];
  const todayAna = analyses.filter(a=>a.created_at?.startsWith(today)).length;
  const approved = ideas.filter(i=>i.status==="approved").length;
  const avgScore = analyses.length>0
    ? (analyses.reduce((s,a)=>s+(a.score??0),0)/analyses.length).toFixed(1) : "—";

  // Spark data — last 10 days
  const now = new Date();
  const sparkBase = Array.from({length:10},(_,i)=>{
    const dt=new Date(now); dt.setDate(now.getDate()-(9-i));
    return { v: analyses.filter(a=>a.created_at?.startsWith(dt.toISOString().split("T")[0])).length };
  });
  const sparkIdeas = Array.from({length:10},(_,i)=>{
    const dt=new Date(now); dt.setDate(now.getDate()-(9-i));
    return { v: ideas.filter(x=>x.created_at?.startsWith(dt.toISOString().split("T")[0])).length };
  });

  // Bar chart — last 8 weeks
  const barData = Array.from({length:8},(_,i)=>{
    const dt=new Date(now); dt.setDate(now.getDate()-(7-i)*7);
    const label = dt.toLocaleDateString("en-US",{month:"short",day:"numeric"});
    const analyses_ = analyses.filter(a=>{
      const d=new Date(a.created_at??0);
      const diff=(dt.getTime()-d.getTime())/(1000*3600*24);
      return diff>=0&&diff<7;
    }).length;
    return { label, analyses: analyses_ };
  });

  // Source breakdown
  const srcMap:Record<string,number>={};
  for(const a of analyses){ const n=a.post?.source?.name??"Unknown"; srcMap[n]=(srcMap[n]??0)+1; }
  const topSrc = Object.entries(srcMap).sort((a,b)=>b[1]-a[1]).slice(0,4);

  // Table
  const sorted = [...analyses].sort((a,b)=>new Date(b.created_at??0).getTime()-new Date(a.created_at??0).getTime());
  const totalPages = Math.ceil(sorted.length/PER_PAGE);
  const pageData   = sorted.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const STATS = [
    { icon:ChartBar, label:"Total Analyses",  value:loading?"—":fmt(analyses.length), delta:todayAna>0?`+${todayAna} today`:undefined, color:"#2563eb", sparkData:sparkBase   },
    { icon:TrendUp,  label:"Avg Score",       value:loading?"—":`${avgScore}/10`,     delta:undefined,                                  color:"#7c3aed", sparkData:sparkBase   },
    { icon:Lightbulb,label:"Ideas",           value:loading?"—":fmt(ideas.length),    delta:approved>0?`${approved} approved`:undefined, color:"#059669", sparkData:sparkIdeas  },
    { icon:Users,    label:"Competitors",     value:loading?"—":String(sources.length),delta:undefined,                                  color:"#f59e0b", sparkData:sparkBase.map(d=>({v:Math.round(d.v*0.5)})) },
  ];

  return (
    <div className="min-h-screen" style={{ background:"#f7f8fa", fontFamily:"var(--font-inter)" }}>

      {/* ── Top nav bar ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20" style={{ boxShadow:"0 1px 0 rgba(0,0,0,0.05)" }}>
        <div className="flex items-center justify-between px-6 h-14">

          {/* Page tabs */}
          <nav className="flex items-center gap-1">
            {[
              { label:"Overview",      href:"/dashboard" },
              { label:"Intelligence",  href:"/dashboard/analysis" },
              { label:"Ad Studio",     href:"/dashboard/ads" },
              { label:"Ideas",         href:"/dashboard/ideas" },
              { label:"Sources",       href:"/dashboard/sources" },
            ].map(({ label, href })=>{
              const active = href==="/dashboard";
              return (
                <button key={label} onClick={()=>router.push(href)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                  style={{ background:active?"#eff6ff":"transparent", color:active?"#2563eb":"#6b7280" }}>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"/>}
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
              <MagnifyingGlass size={15} className="text-gray-400"/>
            </button>
            <button className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors relative">
              <Bell size={15} className="text-gray-400"/>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500"/>
            </button>
            <div className="flex items-center gap-2.5 pl-3 ml-1 border-l border-gray-100">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-black"
                style={{ background:"linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                {firstName?.[0]??"U"}
              </div>
              <div>
                <p className="text-[12px] font-semibold text-gray-800 leading-tight">{user?.display_name??"User"}</p>
                <p className="text-[10px] text-gray-400">Account owner</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-[1400px] mx-auto">

        {/* ── Greeting ── */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[22px] font-bold text-gray-900">
            Good {timeOfDay}{firstName && <>,&nbsp;<span className="text-blue-600 font-black">{firstName}</span></>}!
          </h1>
          {todayAna > 0 && (
            <div className="flex items-center gap-2 text-[12px] font-medium text-amber-700 bg-amber-50 border border-amber-100 px-3.5 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"/>
              {todayAna} analyses run today
            </div>
          )}
        </div>

        {/* ── Two-column layout ── */}
        <div className="flex gap-4">

          {/* LEFT */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-4">
              {STATS.map(s=><StatCard key={s.label} {...s}/>)}
            </div>

            {/* Bar chart */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5"
              style={{ boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-bold text-gray-900">Analysis Performance</p>
                <div className="flex items-center gap-4 text-[11px] text-gray-400 font-medium">
                  <span>Total: <strong className="text-gray-700">{fmt(analyses.length)}</strong></span>
                  <span>Avg Score: <strong className="text-gray-700">{avgScore}</strong></span>
                  <span>Sources: <strong className="text-gray-700">{sources.length}</strong></span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} barSize={24} margin={{top:16,right:0,left:-20,bottom:0}}>
                  <CartesianGrid vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize:10, fill:"#9ca3af" }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:10, fill:"#9ca3af" }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CustomTooltip/>} cursor={{ fill:"rgba(37,99,235,0.04)" }}/>
                  <Bar dataKey="analyses" radius={[6,6,0,0]}
                    fill="#e0e7ff"
                    // Active/highlighted bar handled via cell
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              style={{ boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                <p className="text-[13px] font-bold text-gray-900">Recent Activity</p>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50 transition-colors">
                    <FunnelSimple size={11}/> Filter
                  </button>
                  <span className="text-[11px] text-gray-400">
                    {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,sorted.length)} of {sorted.length}
                  </span>
                  <div className="flex gap-1">
                    <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}
                      className="w-6 h-6 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-30 hover:bg-gray-50 transition-colors">
                      <CaretLeft size={11} className="text-gray-500"/>
                    </button>
                    <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}
                      className="w-6 h-6 rounded-lg border border-gray-200 flex items-center justify-center disabled:opacity-30 hover:bg-gray-50 transition-colors">
                      <CaretRight size={11} className="text-gray-500"/>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid text-[11px] font-semibold text-gray-400 px-5 py-2.5 border-b border-gray-50 uppercase tracking-wide"
                style={{ gridTemplateColumns:"1.8fr 1fr 1fr 1fr 0.7fr" }}>
                <span>Source</span><span>Hook Type</span><span>Tone</span><span>Date</span><span>Score</span>
              </div>

              {loading ? (
                <div className="p-4 space-y-2">
                  {[1,2,3,4,5].map(i=><div key={i} className="h-10 rounded-xl animate-pulse bg-gray-50"/>)}
                </div>
              ) : pageData.length===0 ? (
                <p className="text-sm text-gray-400 text-center py-12">No analyses yet — run the pipeline to get started</p>
              ) : pageData.map((a,idx)=>(
                <div key={a.id}
                  className="grid items-center px-5 py-3 text-[12px] hover:bg-gray-50/70 transition-colors"
                  style={{ gridTemplateColumns:"1.8fr 1fr 1fr 1fr 0.7fr", borderTop: idx>0?"1px solid #f9fafb":"none" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-[10px] font-black shrink-0"
                      style={{ background:`hsl(${((a.post?.source?.name??"?").charCodeAt(0)*47)%360},55%,55%)` }}>
                      {(a.post?.source?.name??"?")[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-gray-800 truncate">{a.post?.source?.name??"Unknown"}</span>
                  </div>
                  <span className="text-gray-500 capitalize">{a.hook_type??"—"}</span>
                  <span className="text-gray-500 capitalize">{a.tone??"—"}</span>
                  <span className="text-gray-400">{a.created_at?shortDate(a.created_at):"—"}</span>
                  <div>
                    {a.score!=null ? (
                      <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: a.score>=7?"#dcfce7":a.score>=5?"#fef9c3":"#f3f4f6",
                          color:      a.score>=7?"#15803d":a.score>=5?"#92400e":"#6b7280",
                        }}>
                        {a.score}/10
                      </span>
                    ):<span className="text-gray-300">—</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — fixed width */}
          <div className="w-72 shrink-0 space-y-4">

            {/* Quick stats */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4"
              style={{ boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[13px] font-bold text-gray-900">Intelligence</p>
                <button onClick={()=>router.push("/dashboard/analysis")}
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors">
                  View <CaretRight size={10}/>
                </button>
              </div>
              <div className="space-y-2">
                {[
                  { label:"Total analyses", val:fmt(analyses.length), color:"#2563eb" },
                  { label:"Posts scraped",  val:fmt(posts.length),    color:"#7c3aed" },
                  { label:"Avg score",      val:`${avgScore}/10`,     color:"#059669" },
                ].map(({ label, val, color })=>(
                  <div key={label} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background:"#f8f9fa" }}>
                    <span className="text-[11px] font-medium text-gray-500">{label}</span>
                    <span className="text-[13px] font-black" style={{ color }}>{loading?"—":val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Source breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4"
              style={{ boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[13px] font-bold text-gray-900">Top Sources</p>
                <button onClick={()=>router.push("/dashboard/sources")}
                  className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">See all</button>
              </div>
              {loading ? (
                <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-9 rounded-xl bg-gray-50 animate-pulse"/>)}</div>
              ) : topSrc.length===0 ? (
                <p className="text-[12px] text-gray-400 text-center py-6">No sources yet</p>
              ) : topSrc.map(([name,count],i)=>{
                const pct=Math.round((count/topSrc[0][1])*100);
                const colors=["#2563eb","#7c3aed","#059669","#f59e0b"];
                return (
                  <div key={name} className="mb-3 last:mb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-lg flex items-center justify-center text-white text-[8px] font-black"
                          style={{ background:colors[i] }}>
                          {name[0].toUpperCase()}
                        </div>
                        <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[120px]">{name}</span>
                      </div>
                      <span className="text-[11px] font-bold text-gray-500">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:colors[i] }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pipeline activity — like tracking timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4"
              style={{ boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
              <p className="text-[13px] font-bold text-gray-900 mb-4">Pipeline Activity</p>
              {!loading && analyses.slice(0,4).map((a,i)=>(
                <div key={a.id} className="flex items-start gap-3 mb-3 last:mb-0">
                  <div className="flex flex-col items-center shrink-0 pt-1">
                    <div className="w-2 h-2 rounded-full shrink-0"
                      style={{ background:i===0?"#2563eb":"#e5e7eb" }}/>
                    {i<3 && <div className="w-px bg-gray-100 mt-1" style={{ height:28 }}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-gray-800 truncate">{a.post?.source?.name??"Unknown"}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{a.created_at?timeAgo(a.created_at):""}</p>
                  </div>
                  {a.score!=null&&(
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background:a.score>=7?"#dcfce7":"#f3f4f6", color:a.score>=7?"#15803d":"#6b7280" }}>
                      {a.score}/10
                    </span>
                  )}
                </div>
              ))}
              {!loading && analyses.length===0 && (
                <p className="text-[12px] text-gray-400 text-center py-4">No activity yet</p>
              )}
              {!loading && analyses.length>0 && (
                <button onClick={()=>router.push("/dashboard/analysis")}
                  className="w-full mt-2 py-2 rounded-xl text-[11px] font-semibold text-blue-600 border border-blue-100 hover:bg-blue-50 transition-colors">
                  View full intelligence →
                </button>
              )}
            </div>

            {/* Ideas pipeline */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4"
              style={{ boxShadow:"0 1px 6px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[13px] font-bold text-gray-900">Ideas</p>
                <button onClick={()=>router.push("/dashboard/ideas")}
                  className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">See all</button>
              </div>
              <div className="space-y-2">
                {[
                  { label:"Draft",    val:ideas.filter(i=>i.status==="draft").length,    bg:"#f3f4f6", color:"#6b7280" },
                  { label:"Approved", val:ideas.filter(i=>i.status==="approved").length, bg:"#dcfce7", color:"#15803d" },
                  { label:"Total",    val:ideas.length,                                  bg:"#dbeafe", color:"#1d4ed8" },
                ].map(({ label, val, bg, color })=>(
                  <div key={label} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background:bg }}>
                    <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
                    <span className="text-[14px] font-black" style={{ color }}>{loading?"—":val}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
