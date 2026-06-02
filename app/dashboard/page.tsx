"use client";

import { useState, useEffect } from "react";
import { useUser } from "./UserContext";
import { MagnifyingGlass, Bell, FunnelSimple, DownloadSimple, CaretRight, CaretLeft, ArrowUpRight, ArrowDownRight } from "@phosphor-icons/react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface Analysis { id:string; score?:number; created_at?:string; hook_type?:string; tone?:string; topic?:string; post?:{source?:{name?:string;platform?:string}} }
interface Idea     { id:string; status?:string; headline?:string; created_at?:string }
interface Source   { id:string; name:string; platform?:string; created_at?:string }
interface Post     { id:string; created_at?:string }

function fmt(n:number){ return n>=1000?`${(n/1000).toFixed(1)}K`:String(n); }
function timeAgo(iso:string){
  const d=Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if(d<60) return `${d}s ago`; if(d<3600) return `${Math.floor(d/60)}m ago`;
  if(d<86400) return `${Math.floor(d/3600)}h ago`; return `${Math.floor(d/86400)}d ago`;
}
function shortDate(iso:string){
  return new Date(iso).toLocaleDateString("en-US",{day:"2-digit",month:"short",year:"numeric"});
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Spark({ values, color }: { values:number[]; color:string }) {
  if(values.length<2) return null;
  const max=Math.max(...values,1), min=Math.min(...values);
  const range=max-min||1;
  const w=80, h=28;
  const pts=values.map((v,i)=>({ x:(i/(values.length-1))*w, y:h-((v-min)/range)*(h-4)-2 }));
  const d=pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow:"visible" }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Bar chart ────────────────────────────────────────────────────────────────
function AnalyticsChart({ data }: { data:{label:string;value:number;highlight?:boolean}[] }) {
  const max=Math.max(...data.map(d=>d.value),1);
  const yTicks=[0,500,1000,1500,2000,2500];
  const chartH=200;
  return (
    <div className="flex gap-3">
      {/* Y axis */}
      <div className="flex flex-col justify-between text-[10px] text-gray-400 text-right shrink-0 pb-5" style={{height:chartH+20}}>
        {[...yTicks].reverse().map(t=><span key={t}>{t>=1000?`${t/1000}K`:t}</span>)}
      </div>
      {/* Bars */}
      <div className="flex-1">
        <div className="flex items-end gap-2 relative" style={{height:chartH}}>
          {/* Horizontal grid lines */}
          {yTicks.slice(1).map(t=>(
            <div key={t} className="absolute left-0 right-0" style={{bottom:`${(t/max)*100}%`,borderTop:"1px dashed #f0f0f0"}}/>
          ))}
          {data.map((d,i)=>{
            const h=Math.max((d.value/max)*chartH,4);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                {d.highlight && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap">
                    {fmt(d.value)}
                  </div>
                )}
                <div className="w-full rounded-t-lg transition-all" style={{
                  height:h,
                  background: d.highlight ? "#2563eb" : "#e5e7eb",
                  boxShadow: d.highlight ? "0 0 16px rgba(37,99,235,0.35)" : "none",
                }}/>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-1">
          {data.map(d=><p key={d.label} className="flex-1 text-center text-[10px] text-gray-400">{d.label}</p>)}
        </div>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ children, className="", style={} }: { children:React.ReactNode; className?:string; style?:React.CSSProperties }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 ${className}`}
      style={{ boxShadow:"0 1px 4px rgba(0,0,0,0.05)", ...style }}>
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const user=useUser();
  const router=useRouter();
  const [analyses,setAnalyses]=useState<Analysis[]>([]);
  const [ideas,setIdeas]=useState<Idea[]>([]);
  const [sources,setSources]=useState<Source[]>([]);
  const [posts,setPosts]=useState<Post[]>([]);
  const [loading,setLoading]=useState(true);
  const [page,setPage]=useState(1);
  const PER_PAGE=8;

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

  const hour=new Date().getHours();
  const timeOfDay=hour<12?"Good Morning":hour<17?"Good Afternoon":"Good Evening";
  const firstName=user?.display_name?.split(" ")[0]??"";

  const today=new Date().toISOString().split("T")[0];
  const todayAna=analyses.filter(a=>a.created_at?.startsWith(today)).length;
  const approved=ideas.filter(i=>i.status==="approved").length;
  const avgScore=analyses.length>0?(analyses.reduce((s,a)=>s+(a.score??0),0)/analyses.length).toFixed(1):null;

  // Weekly sparkline data
  const sparkDays=Array.from({length:7},(_,i)=>{
    const dt=new Date(); dt.setDate(dt.getDate()-(6-i));
    return analyses.filter(a=>a.created_at?.startsWith(dt.toISOString().split("T")[0])).length;
  });
  const sparkIdeas=Array.from({length:7},(_,i)=>{
    const dt=new Date(); dt.setDate(dt.getDate()-(6-i));
    return ideas.filter(x=>x.created_at?.startsWith(dt.toISOString().split("T")[0])).length;
  });

  // Chart — last 8 weeks
  const chartData=Array.from({length:8},(_,i)=>{
    const dt=new Date(); dt.setDate(dt.getDate()-(7-i)*7);
    const label=dt.toLocaleDateString("en-US",{month:"short",day:"numeric"});
    const val=analyses.filter(a=>{
      const d=new Date(a.created_at??0); const diff=(dt.getTime()-d.getTime())/(1000*3600*24);
      return diff>=0&&diff<7;
    }).length;
    return { label, value:val, highlight:i===5 };
  });

  // Source counts for right panel
  const srcMap:Record<string,number>={};
  for(const a of analyses){ const n=a.post?.source?.name??"Unknown"; srcMap[n]=(srcMap[n]??0)+1; }
  const topSrc=Object.entries(srcMap).sort((a,b)=>b[1]-a[1]).slice(0,4);

  // Recent table
  const sorted=[...analyses].sort((a,b)=>new Date(b.created_at??0).getTime()-new Date(a.created_at??0).getTime());
  const totalPages=Math.ceil(sorted.length/PER_PAGE);
  const pageData=sorted.slice((page-1)*PER_PAGE,page*PER_PAGE);

  const STATS=[
    { label:"Total Analyses",   value:loading?"—":fmt(analyses.length),  delta:todayAna,   up:true,  spark:sparkDays  },
    { label:"Active Sources",   value:loading?"—":String(sources.length), delta:null,       up:true,  spark:sparkDays.map(()=>Math.floor(Math.random()*3)) },
    { label:"Ideas Generated",  value:loading?"—":fmt(ideas.length),     delta:approved,   up:true,  spark:sparkIdeas },
  ];

  return (
    <div className="min-h-screen" style={{ background:"#f7f8fa" }}>

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Nav tabs */}
          <div className="flex items-center gap-1">
            {["Overview","Intelligence","Ad Studio","Ideas","Sources"].map((tab,i)=>(
              <button key={tab}
                onClick={()=>{ if(i===1) router.push("/dashboard/analysis"); else if(i===2) router.push("/dashboard/ads"); else if(i===3) router.push("/dashboard/ideas"); else if(i===4) router.push("/dashboard/sources"); }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: i===0?"#f0f4ff":"transparent",
                  color: i===0?"#2563eb":"#6b7280",
                }}>
                {i===0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"/>}
                {tab}
              </button>
            ))}
          </div>
          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-xl hover:bg-gray-50 transition-colors">
              <MagnifyingGlass size={16} className="text-gray-500"/>
            </button>
            <button className="p-2 rounded-xl hover:bg-gray-50 transition-colors relative">
              <Bell size={16} className="text-gray-500"/>
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500"/>
            </button>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-100">
              <div className="w-7 h-7 rounded-xl overflow-hidden shrink-0"
                style={{ background:"linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-black">
                  {firstName?.[0]??"U"}
                </div>
              </div>
              <div className="hidden sm:block">
                <p className="text-[11px] font-bold text-gray-800 leading-tight">{user?.display_name??"User"}</p>
                <p className="text-[9px] text-gray-400">Account owner</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">

        {/* ── Greeting row ── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              Hi {firstName && <span className="text-blue-600">{firstName}</span>}{firstName?", ":""}{timeOfDay}!
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full">
            <span className="font-semibold">{todayAna > 0 ? `${todayAna} analyses run today` : "No analyses run today — try the pipeline"}</span>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-12 gap-4">

          {/* LEFT col */}
          <div className="col-span-8 space-y-4">

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4">
              {STATS.map(({ label, value, delta, up, spark })=>(
                <Card key={label} className="p-4">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
                      {delta!=null && delta>0 && (
                        <p className="flex items-center gap-0.5 text-[10px] font-bold mt-1" style={{ color:up?"#10b981":"#ef4444" }}>
                          {up?<ArrowUpRight size={11}/>:<ArrowDownRight size={11}/>}
                          +{delta} today
                        </p>
                      )}
                    </div>
                    <Spark values={spark} color={up?"#10b981":"#ef4444"} />
                  </div>
                </Card>
              ))}
            </div>

            {/* Analytics chart */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-gray-900">Analysis Performance</p>
                <div className="flex items-center gap-4 text-[10px] text-gray-500">
                  <span>Total: <strong className="text-gray-900">{fmt(analyses.length)}</strong></span>
                  <span>Today: <strong className="text-gray-900">{todayAna}</strong></span>
                  <span>Avg Score: <strong className="text-gray-900">{avgScore??"—"}</strong></span>
                </div>
              </div>
              {loading ? (
                <div className="h-52 rounded-xl animate-pulse bg-gray-100"/>
              ) : (
                <AnalyticsChart data={chartData}/>
              )}
            </Card>

            {/* Recent activity table */}
            <Card>
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                <p className="text-sm font-black text-gray-900">Recent Activity</p>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-400 font-medium">
                    {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,sorted.length)} of {sorted.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}
                      className="p-1 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors">
                      <CaretLeft size={12} className="text-gray-500"/>
                    </button>
                    <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}
                      className="p-1 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors">
                      <CaretRight size={12} className="text-gray-500"/>
                    </button>
                  </div>
                </div>
              </div>

              {/* Table header */}
              <div className="grid px-5 py-2 border-b border-gray-50"
                style={{ gridTemplateColumns:"1.5fr 1fr 1fr 1fr 0.8fr" }}>
                {["Source","Hook Type","Tone","Date","Score"].map(h=>(
                  <p key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</p>
                ))}
              </div>

              {loading ? (
                <div className="p-4 space-y-2">
                  {[1,2,3,4].map(i=><div key={i} className="h-10 rounded-xl animate-pulse bg-gray-50"/>)}
                </div>
              ) : pageData.length===0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No analyses yet — run the pipeline</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {pageData.map(a=>(
                    <div key={a.id} className="grid px-5 py-3 items-center hover:bg-gray-50/60 transition-colors"
                      style={{ gridTemplateColumns:"1.5fr 1fr 1fr 1fr 0.8fr" }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-[9px] font-black shrink-0"
                          style={{ background:"linear-gradient(135deg,#2563eb,#7c3aed)" }}>
                          {(a.post?.source?.name??"?")[0].toUpperCase()}
                        </div>
                        <span className="text-[12px] font-semibold text-gray-800 truncate">{a.post?.source?.name??"Unknown"}</span>
                      </div>
                      <span className="text-[11px] text-gray-600 capitalize">{a.hook_type??"—"}</span>
                      <span className="text-[11px] text-gray-600 capitalize">{a.tone??"—"}</span>
                      <span className="text-[11px] text-gray-400">{a.created_at?shortDate(a.created_at):"—"}</span>
                      <div>
                        {a.score!=null?(
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                            style={{ background:a.score>=7?"#dcfce7":a.score>=5?"#fef9c3":"#f3f4f6",
                                     color:a.score>=7?"#15803d":a.score>=5?"#92400e":"#6b7280" }}>
                            {a.score}/10
                          </span>
                        ):<span className="text-[11px] text-gray-300">—</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT col */}
          <div className="col-span-4 space-y-4">

            {/* Header card */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-black text-gray-900">Intelligence Feed</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Last 30 days</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <FunnelSimple size={13} className="text-gray-500"/>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all hover:opacity-90"
                    style={{ background:"#2563eb" }}
                    onClick={()=>router.push("/dashboard/analysis")}>
                    <DownloadSimple size={12}/> View all
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl p-3" style={{ background:"#eff6ff" }}>
                  <p className="text-[9px] font-semibold text-blue-400 uppercase tracking-widest">Analyses</p>
                  <p className="text-xl font-black text-blue-700 mt-0.5">{loading?"—":fmt(analyses.length)}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background:"#f0fdf4" }}>
                  <p className="text-[9px] font-semibold text-green-400 uppercase tracking-widest">Approved</p>
                  <p className="text-xl font-black text-green-700 mt-0.5">{loading?"—":approved}</p>
                </div>
              </div>
            </Card>

            {/* Top sources panel */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-black text-gray-900">Top Sources</p>
                <button onClick={()=>router.push("/dashboard/sources")}
                  className="text-[10px] font-semibold text-blue-500 hover:underline">View all</button>
              </div>

              {loading ? (
                <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-8 rounded-xl bg-gray-50 animate-pulse"/>)}</div>
              ) : topSrc.length===0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No sources tracked yet</p>
              ) : (
                <div className="space-y-3">
                  {topSrc.map(([name,count],i)=>{
                    const max=topSrc[0][1];
                    return (
                      <div key={name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-lg flex items-center justify-center text-white text-[8px] font-black"
                              style={{ background:`hsl(${220+i*30},70%,55%)` }}>
                              {name[0].toUpperCase()}
                            </div>
                            <span className="text-[11px] font-semibold text-gray-700 truncate max-w-[110px]">{name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-blue-500">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden bg-gray-100">
                          <div className="h-full rounded-full" style={{ width:`${(count/max)*100}%`, background:`hsl(${220+i*30},70%,55%)` }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Timeline-style recent */}
              {!loading && analyses.length>0 && (
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Pipeline activity</p>
                  <div className="space-y-3">
                    {analyses.slice(0,3).map((a,i)=>(
                      <div key={a.id} className="flex items-start gap-2.5">
                        <div className="flex flex-col items-center shrink-0 mt-1">
                          <div className="w-2 h-2 rounded-full" style={{ background:i===0?"#2563eb":"#d1d5db" }}/>
                          {i<2&&<div className="w-px flex-1 bg-gray-100 mt-1" style={{ height:20 }}/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-gray-700 truncate">{a.post?.source?.name??"Unknown"} analysed</p>
                          <p className="text-[9px] text-gray-400 mt-0.5">{a.created_at?timeAgo(a.created_at):""}</p>
                        </div>
                        {a.score!=null&&(
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ background:a.score>=7?"#dcfce7":"#f3f4f6",color:a.score>=7?"#15803d":"#6b7280" }}>
                            {a.score}/10
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Ideas pipeline */}
            <Card className="p-4">
              <p className="text-xs font-black text-gray-900 mb-3">Ideas Pipeline</p>
              <div className="space-y-2">
                {[
                  { label:"Draft",    count:ideas.filter(i=>i.status==="draft").length,    color:"#6b7280", bg:"#f3f4f6" },
                  { label:"Approved", count:ideas.filter(i=>i.status==="approved").length, color:"#15803d", bg:"#dcfce7" },
                  { label:"Total",    count:ideas.length,                                  color:"#1d4ed8", bg:"#dbeafe" },
                ].map(({ label, count, color, bg })=>(
                  <div key={label} className="flex items-center justify-between px-3 py-2 rounded-xl"
                    style={{ background:bg }}>
                    <span className="text-[11px] font-semibold" style={{ color }}>{label}</span>
                    <span className="text-sm font-black" style={{ color }}>{loading?"—":count}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>router.push("/dashboard/ideas")}
                className="w-full mt-3 py-2 rounded-xl text-[11px] font-bold text-blue-600 border border-blue-100 hover:bg-blue-50 transition-colors">
                View all ideas →
              </button>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
