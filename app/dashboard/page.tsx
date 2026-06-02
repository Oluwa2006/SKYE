"use client";

import { useState, useEffect } from "react";
import { useUser } from "./UserContext";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import {
  MagnifyingGlass, Bell, CaretRight, CaretLeft,
  ArrowUpRight, TrendUp, Lightbulb, ChartBar, Users,
} from "@phosphor-icons/react";

interface Analysis { id:string; score?:number; created_at?:string; hook_type?:string; tone?:string; post?:{source?:{name?:string}} }
interface Idea     { id:string; status?:string; created_at?:string }
interface Source   { id:string; name:string; created_at?:string }
interface Post     { id:string; created_at?:string }

function fmt(n:number){ return n>=1000?`${(n/1000).toFixed(1)}K`:String(n); }
function shortDate(iso:string){
  return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"2-digit"});
}
function timeAgo(iso:string){
  const d=Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if(d<3600) return `${Math.floor(d/60)}m ago`;
  if(d<86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}

function Tip({ active, payload, label }:{ active?:boolean; payload?:{value:number}[]; label?:string }) {
  if(!active||!payload?.length) return null;
  return (
    <div className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold shadow-lg"
      style={{ background:"#111", color:"#fff" }}>
      <p className="text-gray-400 text-[10px]">{label}</p>
      <p>{payload[0].value} analyses</p>
    </div>
  );
}

function StatCard({ icon:Icon, label, value, delta, color, spark }:{
  icon:React.ElementType; label:string; value:string;
  delta?:string; color:string; spark:{v:number}[];
}) {
  return (
    <div className="rounded-xl p-3 border border-gray-100 bg-white flex flex-col gap-1"
      style={{ boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center justify-between">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background:`${color}12` }}>
          <Icon size={12} weight="duotone" style={{ color }}/>
        </div>
        {delta && (
          <span className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background:`${color}10`, color }}>
            <ArrowUpRight size={8}/>{delta}
          </span>
        )}
      </div>
      <p className="text-[10px] text-gray-400 font-medium leading-none">{label}</p>
      <p className="text-lg font-black text-gray-900 leading-none">{value}</p>
      <div className="mt-0.5">
        <ResponsiveContainer width="100%" height={24}>
          <AreaChart data={spark} margin={{top:0,right:0,left:0,bottom:0}}>
            <defs>
              <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.15}/>
                <stop offset="100%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.2}
              fill={`url(#g-${label})`} dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user   = useUser();
  const router = useRouter();

  const [analyses,setAnalyses] = useState<Analysis[]>([]);
  const [ideas,   setIdeas]    = useState<Idea[]>([]);
  const [sources, setSources]  = useState<Source[]>([]);
  const [posts,   setPosts]    = useState<Post[]>([]);
  const [loading, setLoading]  = useState(true);
  const [page,    setPage]     = useState(1);
  const PER_PAGE = 5;

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
  const timeOfDay=hour<12?"Morning":hour<17?"Afternoon":"Evening";
  const firstName=user?.display_name?.split(" ")[0]??"";
  const today=new Date().toISOString().split("T")[0];
  const todayAna=analyses.filter(a=>a.created_at?.startsWith(today)).length;
  const approved=ideas.filter(i=>i.status==="approved").length;
  const avgScore=analyses.length>0
    ? (analyses.reduce((s,a)=>s+(a.score??0),0)/analyses.length).toFixed(1) : "—";

  const now=new Date();
  const mkSpark=(fn:(dt:Date)=>number)=>Array.from({length:10},(_,i)=>{ const dt=new Date(now); dt.setDate(now.getDate()-(9-i)); return { v:fn(dt) }; });
  const sparkAna   = mkSpark(dt=>analyses.filter(a=>a.created_at?.startsWith(dt.toISOString().split("T")[0])).length);
  const sparkIdeas = mkSpark(dt=>ideas.filter(x=>x.created_at?.startsWith(dt.toISOString().split("T")[0])).length);

  const barData=Array.from({length:7},(_,i)=>{
    const dt=new Date(now); dt.setDate(now.getDate()-(6-i)*7);
    return {
      label: dt.toLocaleDateString("en-US",{month:"short",day:"numeric"}),
      analyses: analyses.filter(a=>{ const d=new Date(a.created_at??0); const diff=(dt.getTime()-d.getTime())/(1000*3600*24); return diff>=0&&diff<7; }).length,
    };
  });

  const srcMap:Record<string,number>={};
  for(const a of analyses){ const n=a.post?.source?.name??"Unknown"; srcMap[n]=(srcMap[n]??0)+1; }
  const topSrc=Object.entries(srcMap).sort((a,b)=>b[1]-a[1]).slice(0,3);

  const sorted=[...analyses].sort((a,b)=>new Date(b.created_at??0).getTime()-new Date(a.created_at??0).getTime());
  const totalPages=Math.ceil(sorted.length/PER_PAGE);
  const pageData=sorted.slice((page-1)*PER_PAGE,page*PER_PAGE);

  const STATS=[
    { icon:ChartBar, label:"Analyses",   value:loading?"—":fmt(analyses.length), delta:todayAna>0?`+${todayAna}`:undefined, color:"#2563eb", spark:sparkAna  },
    { icon:TrendUp,  label:"Avg Score",  value:loading?"—":`${avgScore}/10`,     delta:undefined,                            color:"#7c3aed", spark:sparkAna  },
    { icon:Lightbulb,label:"Ideas",      value:loading?"—":fmt(ideas.length),    delta:approved>0?`${approved} ok`:undefined, color:"#059669", spark:sparkIdeas },
    { icon:Users,    label:"Competitors",value:loading?"—":String(sources.length),delta:undefined,                            color:"#f59e0b", spark:sparkAna.map(d=>({v:Math.min(d.v,sources.length)})) },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 h-11 shrink-0 border-b border-gray-100">
        <nav className="flex items-center gap-0.5">
          {[
            { l:"Overview",     h:"/dashboard" },
            { l:"Intelligence", h:"/dashboard/analysis" },
            { l:"Ad Studio",    h:"/dashboard/ads" },
            { l:"Ideas",        h:"/dashboard/ideas" },
            { l:"Sources",      h:"/dashboard/sources" },
          ].map(({ l, h })=>(
            <button key={l} onClick={()=>router.push(h)}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium transition-all"
              style={{ background:h==="/dashboard"?"#eff6ff":"transparent", color:h==="/dashboard"?"#2563eb":"#9ca3af" }}>
              {h==="/dashboard"&&<span className="w-1.5 h-1.5 rounded-full bg-blue-500"/>}
              {l}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <MagnifyingGlass size={13} className="text-gray-400"/>
          </button>
          <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors relative">
            <Bell size={13} className="text-gray-400"/>
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500"/>
          </button>
          <div className="flex items-center gap-1.5 pl-2 ml-1 border-l border-gray-100">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-black"
              style={{ background:"linear-gradient(135deg,#2563eb,#7c3aed)" }}>
              {firstName?.[0]??"U"}
            </div>
            <span className="text-[11px] font-semibold text-gray-700">{user?.display_name??"User"}</span>
          </div>
        </div>
      </div>

      {/* ── Body — fills remaining height ── */}
      <div className="flex-1 min-h-0 flex gap-3 p-3">

        {/* LEFT */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">

          {/* Greeting + stats */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="shrink-0">
              <p className="text-[10px] text-gray-400 font-medium">Good {timeOfDay}</p>
              <h1 className="text-lg font-black text-gray-900 leading-tight">
                {firstName || "Welcome"}
                {firstName && <span className="text-blue-600"> ↗</span>}
              </h1>
            </div>
            <div className="flex-1 grid grid-cols-4 gap-2">
              {STATS.map(s=><StatCard key={s.label} {...s}/>)}
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-100 p-3"
            style={{ boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-gray-800">Analysis Performance</p>
              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                <span>Total <strong className="text-gray-700">{fmt(analyses.length)}</strong></span>
                <span>Score <strong className="text-gray-700">{avgScore}</strong></span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={barData} barSize={14} margin={{top:4,right:0,left:-24,bottom:0}}>
                <CartesianGrid vertical={false} stroke="#f5f5f5"/>
                <XAxis dataKey="label" tick={{ fontSize:9, fill:"#9ca3af" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:9, fill:"#9ca3af" }} axisLine={false} tickLine={false}/>
                <Tooltip content={<Tip/>} cursor={{ fill:"rgba(37,99,235,0.04)" }}/>
                <Bar dataKey="analyses" fill="#dbeafe" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="shrink-0 bg-white rounded-xl border border-gray-100 overflow-hidden"
            style={{ boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50">
              <p className="text-[11px] font-bold text-gray-800">Recent Activity</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,sorted.length)} of {sorted.length}</span>
                <div className="flex gap-0.5">
                  <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}
                    className="w-5 h-5 rounded border border-gray-200 flex items-center justify-center disabled:opacity-30 hover:bg-gray-50">
                    <CaretLeft size={9} className="text-gray-500"/>
                  </button>
                  <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}
                    className="w-5 h-5 rounded border border-gray-200 flex items-center justify-center disabled:opacity-30 hover:bg-gray-50">
                    <CaretRight size={9} className="text-gray-500"/>
                  </button>
                </div>
              </div>
            </div>
            <div className="grid text-[9px] font-semibold text-gray-400 uppercase tracking-wide px-4 py-1.5 bg-gray-50/60 border-b border-gray-50"
              style={{ gridTemplateColumns:"1.5fr 1fr 1fr 0.8fr 0.6fr" }}>
              <span>Source</span><span>Hook</span><span>Tone</span><span>Date</span><span>Score</span>
            </div>
            {loading ? (
              <div className="p-3 space-y-1.5">{[1,2,3].map(i=><div key={i} className="h-7 rounded-lg bg-gray-50 animate-pulse"/>)}</div>
            ) : pageData.length===0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No analyses yet</p>
            ) : pageData.map((a,idx)=>(
              <div key={a.id} className="grid items-center px-4 py-2 text-[11px] hover:bg-gray-50/60 transition-colors"
                style={{ gridTemplateColumns:"1.5fr 1fr 1fr 0.8fr 0.6fr", borderTop:idx>0?"1px solid #f9fafb":"none" }}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[8px] font-black shrink-0"
                    style={{ background:`hsl(${((a.post?.source?.name??"?").charCodeAt(0)*47)%360},55%,55%)` }}>
                    {(a.post?.source?.name??"?")[0].toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-800 truncate">{a.post?.source?.name??"Unknown"}</span>
                </div>
                <span className="text-gray-500 capitalize truncate">{a.hook_type??"—"}</span>
                <span className="text-gray-500 capitalize truncate">{a.tone??"—"}</span>
                <span className="text-gray-400">{a.created_at?shortDate(a.created_at):"—"}</span>
                <div>{a.score!=null?(
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background:a.score>=7?"#dcfce7":"#f3f4f6", color:a.score>=7?"#15803d":"#6b7280" }}>
                    {a.score}/10
                  </span>
                ):<span className="text-gray-300 text-[10px]">—</span>}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — narrow panel */}
        <div className="w-52 shrink-0 flex flex-col gap-2.5">

          {/* Stats summary */}
          <div className="bg-white rounded-xl border border-gray-100 p-3 shrink-0"
            style={{ boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[11px] font-bold text-gray-800">Overview</p>
              <button onClick={()=>router.push("/dashboard/analysis")}
                className="text-[10px] font-semibold text-blue-500 flex items-center gap-0.5 hover:underline">
                View <CaretRight size={9}/>
              </button>
            </div>
            <div className="space-y-1.5">
              {[
                { l:"Posts scraped", v:fmt(posts.length), c:"#2563eb" },
                { l:"Avg score",     v:`${avgScore}/10`,  c:"#7c3aed" },
                { l:"Approved ideas",v:String(approved),  c:"#059669" },
              ].map(({ l, v, c })=>(
                <div key={l} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
                  style={{ background:"#f8f9fa" }}>
                  <span className="text-[10px] text-gray-500">{l}</span>
                  <span className="text-[11px] font-black" style={{ color:c }}>{loading?"—":v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top sources */}
          <div className="bg-white rounded-xl border border-gray-100 p-3 shrink-0"
            style={{ boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <p className="text-[11px] font-bold text-gray-800 mb-2.5">Top Sources</p>
            {loading ? <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-6 rounded bg-gray-50 animate-pulse"/>)}</div>
            : topSrc.length===0 ? <p className="text-[10px] text-gray-400 text-center py-3">No sources yet</p>
            : topSrc.map(([name,count],i)=>{
              const c=["#2563eb","#7c3aed","#059669"][i];
              return (
                <div key={name} className="mb-2 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-gray-600 truncate max-w-[110px]">{name}</span>
                    <span className="text-[10px] font-bold" style={{ color:c }}>{count}</span>
                  </div>
                  <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width:`${(count/topSrc[0][1])*100}%`, background:c }}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pipeline timeline */}
          <div className="bg-white rounded-xl border border-gray-100 p-3 flex-1 min-h-0 overflow-hidden"
            style={{ boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <p className="text-[11px] font-bold text-gray-800 mb-2.5">Pipeline</p>
            {analyses.slice(0,5).map((a,i)=>(
              <div key={a.id} className="flex items-start gap-2 mb-2 last:mb-0">
                <div className="flex flex-col items-center shrink-0 pt-1">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:i===0?"#2563eb":"#e5e7eb" }}/>
                  {i<4&&<div className="w-px bg-gray-100 mt-1" style={{ height:18 }}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-gray-700 truncate">{a.post?.source?.name??"Unknown"}</p>
                  <p className="text-[9px] text-gray-400">{a.created_at?timeAgo(a.created_at):""}</p>
                </div>
                {a.score!=null&&<span className="text-[9px] font-bold shrink-0"
                  style={{ color:a.score>=7?"#15803d":"#6b7280" }}>{a.score}</span>}
              </div>
            ))}
            {!loading&&analyses.length===0&&<p className="text-[10px] text-gray-400 text-center py-4">No activity</p>}
          </div>

          {/* Ideas */}
          <div className="bg-white rounded-xl border border-gray-100 p-3 shrink-0"
            style={{ boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-gray-800">Ideas</p>
              <button onClick={()=>router.push("/dashboard/ideas")}
                className="text-[10px] text-blue-500 hover:underline">See all</button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { l:"Draft",    v:ideas.filter(i=>i.status==="draft").length,    c:"#6b7280", bg:"#f3f4f6" },
                { l:"Ready",    v:ideas.filter(i=>i.status==="approved").length, c:"#15803d", bg:"#dcfce7" },
                { l:"Total",    v:ideas.length,                                  c:"#1d4ed8", bg:"#dbeafe" },
              ].map(({ l, v, c, bg })=>(
                <div key={l} className="rounded-lg p-2 text-center" style={{ background:bg }}>
                  <p className="text-[9px] font-medium" style={{ color:c }}>{l}</p>
                  <p className="text-base font-black" style={{ color:c }}>{loading?"—":v}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
