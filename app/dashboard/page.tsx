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
  ChartBar, Lightbulb, Users, TrendUp,
  ArrowUpRight, SignOut,
} from "@phosphor-icons/react";
import { createSupabaseBrowser } from "@/lib/supabase-client";

interface Analysis { id:string; score?:number; created_at?:string; hook_type?:string; tone?:string; post?:{source?:{name?:string}} }
interface Idea     { id:string; status?:string; created_at?:string }
interface Source   { id:string; name:string; created_at?:string }
interface Post     { id:string; created_at?:string }

function fmt(n:number){ return n>=1000?`${(n/1000).toFixed(1)}K`:String(n); }
function shortDate(iso:string){ return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"2-digit"}); }
function timeAgo(iso:string){
  const d=Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if(d<3600) return `${Math.max(1,Math.floor(d/60))}m ago`;
  if(d<86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}

// ─── Glass shell ──────────────────────────────────────────────────────────────
function Glass({ children, className="", style={} }:{ children:React.ReactNode; className?:string; style?:React.CSSProperties }) {
  return (
    <div className={`${className}`} style={{
      background:"rgba(255,255,255,0.52)",
      backdropFilter:"blur(24px) saturate(1.6)",
      WebkitBackdropFilter:"blur(24px) saturate(1.6)",
      border:"1px solid rgba(255,255,255,0.72)",
      boxShadow:"0 4px 24px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
      borderRadius:20,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function Tip({ active, payload, label }:{ active?:boolean; payload?:{value:number}[]; label?:string }) {
  if(!active||!payload?.length) return null;
  return (
    <div style={{ background:"rgba(17,24,39,0.88)", backdropFilter:"blur(8px)", borderRadius:10, padding:"6px 10px" }}>
      <p style={{ color:"#9ca3af", fontSize:9, marginBottom:2 }}>{label}</p>
      <p style={{ color:"#fff", fontSize:11, fontWeight:700 }}>{payload[0].value} analyses</p>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon:Icon, label, value, delta, color, spark }:{
  icon:React.ElementType; label:string; value:string;
  delta?:string; color:string; spark:{v:number}[];
}) {
  return (
    <Glass className="p-3 flex flex-col gap-1.5 flex-1">
      <div className="flex items-center justify-between">
        <div className="w-7 h-7 rounded-2xl flex items-center justify-center" style={{ background:`${color}18` }}>
          <Icon size={13} weight="duotone" style={{ color }}/>
        </div>
        {delta && (
          <span className="flex items-center gap-0.5 text-[9px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background:`${color}14`, color }}>
            <ArrowUpRight size={8}/>{delta}
          </span>
        )}
      </div>
      <p style={{ fontSize:10, color:"#9ca3af", fontWeight:500 }}>{label}</p>
      <p style={{ fontSize:20, fontWeight:900, color:"#111827", lineHeight:1 }}>{value}</p>
      <ResponsiveContainer width="100%" height={28}>
        <AreaChart data={spark} margin={{top:0,right:0,left:0,bottom:0}}>
          <defs>
            <linearGradient id={`g${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2}/>
              <stop offset="100%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#g${label})`} dot={false}/>
        </AreaChart>
      </ResponsiveContainer>
    </Glass>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ email, name, size=28 }:{ email?:string; name?:string; size?:number }) {
  const [failed, setFailed] = useState(false);
  const src = email ? `https://unavatar.io/${encodeURIComponent(email)}` : null;
  const seed = encodeURIComponent(name??email??"user");
  const fallback = `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}`;

  if(src && !failed) return (
    <img src={src} alt={name??"User"} width={size} height={size}
      onError={()=>setFailed(true)}
      style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover" }}/>
  );
  return (
    <img src={fallback} alt={name??"User"} width={size} height={size}
      style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover" }}/>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const user   = useUser();
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const [analyses,setAnalyses]=useState<Analysis[]>([]);
  const [ideas,   setIdeas]   =useState<Idea[]>([]);
  const [sources, setSources] =useState<Source[]>([]);
  const [posts,   setPosts]   =useState<Post[]>([]);
  const [loading, setLoading] =useState(true);
  const [page,    setPage]    =useState(1);
  const PER_PAGE=5;

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

  const firstName = user?.display_name?.split(" ")[0]??"";
  const today     = new Date().toISOString().split("T")[0];
  const todayAna  = analyses.filter(a=>a.created_at?.startsWith(today)).length;
  const approved  = ideas.filter(i=>i.status==="approved").length;
  const avgScore  = analyses.length>0
    ? (analyses.reduce((s,a)=>s+(a.score??0),0)/analyses.length).toFixed(1):"—";

  const now=new Date();
  const mkSpark=(fn:(dt:Date)=>number)=>Array.from({length:10},(_,i)=>{
    const dt=new Date(now); dt.setDate(now.getDate()-(9-i)); return {v:fn(dt)};
  });
  const sparkAna   =mkSpark(dt=>analyses.filter(a=>a.created_at?.startsWith(dt.toISOString().split("T")[0])).length);
  const sparkIdeas =mkSpark(dt=>ideas.filter(x=>x.created_at?.startsWith(dt.toISOString().split("T")[0])).length);

  const barData=Array.from({length:7},(_,i)=>{
    const dt=new Date(now); dt.setDate(now.getDate()-(6-i)*7);
    return {
      label:dt.toLocaleDateString("en-US",{month:"short",day:"numeric"}),
      analyses:analyses.filter(a=>{ const d=new Date(a.created_at??0); const diff=(dt.getTime()-d.getTime())/(1000*3600*24); return diff>=0&&diff<7; }).length,
    };
  });

  const srcMap:Record<string,number>={};
  for(const a of analyses){ const n=a.post?.source?.name??"Unknown"; srcMap[n]=(srcMap[n]??0)+1; }
  const topSrc=Object.entries(srcMap).sort((a,b)=>b[1]-a[1]).slice(0,3);

  const sorted=[...analyses].sort((a,b)=>new Date(b.created_at??0).getTime()-new Date(a.created_at??0).getTime());
  const totalPages=Math.ceil(sorted.length/PER_PAGE);
  const pageData=sorted.slice((page-1)*PER_PAGE,page*PER_PAGE);

  const STATS=[
    { icon:ChartBar,  label:"Analyses",    value:loading?"—":fmt(analyses.length), delta:todayAna>0?`+${todayAna}`:undefined, color:"#2563eb", spark:sparkAna   },
    { icon:TrendUp,   label:"Avg Score",   value:loading?"—":`${avgScore}/10`,     delta:undefined,                            color:"#7c3aed", spark:sparkAna   },
    { icon:Lightbulb, label:"Ideas",       value:loading?"—":fmt(ideas.length),    delta:approved>0?`${approved} ok`:undefined,color:"#059669", spark:sparkIdeas },
    { icon:Users,     label:"Competitors", value:loading?"—":String(sources.length),delta:undefined,                           color:"#f59e0b", spark:sparkAna.map(d=>({v:Math.min(d.v,sources.length)})) },
  ];

  const NAV=[
    {l:"Overview",    h:"/dashboard"},
    {l:"Intelligence",h:"/dashboard/analysis"},
    {l:"Ad Studio",   h:"/dashboard/ads"},
    {l:"Ideas",       h:"/dashboard/ideas"},
    {l:"Sources",     h:"/dashboard/sources"},
    {l:"UGC",         h:"/dashboard/ugc"},
    {l:"Social",      h:"/dashboard/social"},
    {l:"Settings",    h:"/dashboard/settings"},
  ];

  async function signOut(){ await supabase.auth.signOut(); router.push("/login"); }

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ── Top nav ── */}
      <Glass className="mx-3 mt-3 mb-0 px-4 py-0 flex items-center gap-4 shrink-0" style={{ borderRadius:18, height:48 }}>
        {/* Nav links */}
        <nav className="flex items-center gap-0.5 flex-1">
          {NAV.map(({ l, h })=>{
            const active=h==="/dashboard";
            return (
              <button key={l} onClick={()=>router.push(h)}
                className="px-3 py-1.5 text-[11px] font-medium transition-all"
                style={{
                  borderRadius:12,
                  background:active?"rgba(37,99,235,0.1)":"transparent",
                  color:active?"#2563eb":"#6b7280",
                  fontWeight:active?700:500,
                }}>
                {l}
              </button>
            );
          })}
        </nav>

        {/* Right: search, bell, avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <button className="w-7 h-7 rounded-2xl flex items-center justify-center hover:bg-black/05 transition-colors">
            <MagnifyingGlass size={13} weight="bold" style={{ color:"#6b7280" }}/>
          </button>
          <button className="w-7 h-7 rounded-2xl flex items-center justify-center hover:bg-black/05 transition-colors relative">
            <Bell size={13} weight="bold" style={{ color:"#6b7280" }}/>
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background:"#2563eb" }}/>
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-white/50">
            <Avatar email={user?.email} name={user?.display_name} size={26}/>
            <p style={{ fontSize:11, fontWeight:600, color:"#374151" }}>{user?.display_name??"User"}</p>
            <button onClick={signOut} className="w-6 h-6 rounded-xl flex items-center justify-center hover:bg-black/05 transition-colors">
              <SignOut size={11} style={{ color:"#9ca3af" }}/>
            </button>
          </div>
        </div>
      </Glass>

      {/* ── Body ── */}
      <div className="flex-1 min-h-0 flex gap-3 p-3 pt-3">

        {/* LEFT */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">

          {/* Greeting + stats */}
          <div className="flex items-center gap-3 shrink-0">
            <Glass className="px-4 py-2.5 shrink-0" style={{ borderRadius:16 }}>
              <p style={{ fontSize:13, fontWeight:900, color:"#111827", whiteSpace:"nowrap" }}>
                Hi, {firstName||"there"} 👋
              </p>
              <p style={{ fontSize:10, color:"#9ca3af", marginTop:1 }}>
                {new Date().toLocaleDateString("en-US",{ weekday:"long", month:"long", day:"numeric" })}
              </p>
            </Glass>
            <div className="flex gap-2.5 flex-1">
              {STATS.map(s=><StatCard key={s.label} {...s}/>)}
            </div>
          </div>

          {/* Chart */}
          <Glass className="flex-1 min-h-0 p-4">
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontSize:12, fontWeight:700, color:"#111827" }}>Analysis Performance</p>
              <div className="flex gap-4" style={{ fontSize:10, color:"#9ca3af" }}>
                <span>Total <b style={{ color:"#374151" }}>{fmt(analyses.length)}</b></span>
                <span>Avg <b style={{ color:"#374151" }}>{avgScore}/10</b></span>
                <span>Today <b style={{ color:"#374151" }}>{todayAna}</b></span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height="88%">
              <BarChart data={barData} barSize={16} margin={{top:4,right:0,left:-28,bottom:0}}>
                <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.04)"/>
                <XAxis dataKey="label" tick={{ fontSize:9, fill:"#9ca3af" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:9, fill:"#9ca3af" }} axisLine={false} tickLine={false}/>
                <Tooltip content={<Tip/>} cursor={{ fill:"rgba(37,99,235,0.04)" }}/>
                <Bar dataKey="analyses" fill="rgba(37,99,235,0.25)" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Glass>

          {/* Table */}
          <Glass className="shrink-0 overflow-hidden" style={{ borderRadius:18 }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom:"1px solid rgba(255,255,255,0.5)" }}>
              <p style={{ fontSize:11, fontWeight:700, color:"#111827" }}>Recent Activity</p>
              <div className="flex items-center gap-2">
                <span style={{ fontSize:10, color:"#9ca3af" }}>{(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,sorted.length)} of {sorted.length}</span>
                <div className="flex gap-1">
                  {[CaretLeft,CaretRight].map((Icon,i)=>(
                    <button key={i} disabled={i===0?page<=1:page>=totalPages}
                      onClick={()=>setPage(p=>i===0?p-1:p+1)}
                      className="w-5 h-5 flex items-center justify-center rounded-lg transition-colors"
                      style={{ background:"rgba(255,255,255,0.6)", border:"1px solid rgba(255,255,255,0.8)", opacity:(i===0?page<=1:page>=totalPages)?0.3:1 }}>
                      <Icon size={9} style={{ color:"#6b7280" }}/>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid px-4 py-1.5" style={{ gridTemplateColumns:"1.6fr 1fr 1fr 0.8fr 0.6fr", fontSize:9, fontWeight:600, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.06em", borderBottom:"1px solid rgba(255,255,255,0.4)" }}>
              {["Source","Hook","Tone","Date","Score"].map(h=><span key={h}>{h}</span>)}
            </div>
            {loading ? (
              <div className="p-3 space-y-1.5">{[1,2,3,4,5].map(i=><div key={i} className="h-8 rounded-2xl animate-pulse" style={{ background:"rgba(255,255,255,0.4)" }}/>)}</div>
            ) : pageData.length===0 ? (
              <p style={{ fontSize:11, color:"#9ca3af", textAlign:"center", padding:"20px 0" }}>No analyses yet — run the pipeline</p>
            ) : pageData.map((a,idx)=>(
              <div key={a.id} className="grid items-center px-4 py-2 hover:bg-white/30 transition-colors"
                style={{ gridTemplateColumns:"1.6fr 1fr 1fr 0.8fr 0.6fr", fontSize:11, borderTop:idx>0?"1px solid rgba(255,255,255,0.35)":"none" }}>
                <div className="flex items-center gap-2">
                  <Avatar email={undefined} name={a.post?.source?.name} size={20}/>
                  <span style={{ fontWeight:500, color:"#111827" }} className="truncate">{a.post?.source?.name??"Unknown"}</span>
                </div>
                <span style={{ color:"#6b7280" }} className="capitalize truncate">{a.hook_type??"—"}</span>
                <span style={{ color:"#6b7280" }} className="capitalize truncate">{a.tone??"—"}</span>
                <span style={{ color:"#9ca3af" }}>{a.created_at?shortDate(a.created_at):"—"}</span>
                <div>{a.score!=null?(
                  <span style={{ fontSize:9, fontWeight:700, padding:"2px 8px", borderRadius:20,
                    background:a.score>=7?"rgba(21,128,61,0.12)":"rgba(107,114,128,0.1)",
                    color:a.score>=7?"#15803d":"#6b7280" }}>
                    {a.score}/10
                  </span>
                ):<span style={{ color:"#d1d5db", fontSize:9 }}>—</span>}</div>
              </div>
            ))}
          </Glass>
        </div>

        {/* RIGHT */}
        <div className="w-52 shrink-0 flex flex-col gap-3">

          <Glass className="p-3.5 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontSize:11, fontWeight:700, color:"#111827" }}>Summary</p>
              <button onClick={()=>router.push("/dashboard/analysis")}
                className="flex items-center gap-0.5 rounded-full px-2 py-0.5 transition-colors"
                style={{ fontSize:10, fontWeight:600, color:"#2563eb", background:"rgba(37,99,235,0.08)" }}>
                View <CaretRight size={9}/>
              </button>
            </div>
            <div className="space-y-1.5">
              {[
                { l:"Posts scraped", v:fmt(posts.length),   c:"#2563eb" },
                { l:"Avg score",     v:`${avgScore}/10`,    c:"#7c3aed" },
                { l:"Approved",      v:String(approved),    c:"#059669" },
              ].map(({ l, v, c })=>(
                <div key={l} className="flex items-center justify-between px-3 py-2 rounded-2xl"
                  style={{ background:"rgba(255,255,255,0.55)" }}>
                  <span style={{ fontSize:10, color:"#6b7280" }}>{l}</span>
                  <span style={{ fontSize:12, fontWeight:900, color:c }}>{loading?"—":v}</span>
                </div>
              ))}
            </div>
          </Glass>

          <Glass className="p-3.5 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontSize:11, fontWeight:700, color:"#111827" }}>Top Sources</p>
              <button onClick={()=>router.push("/dashboard/sources")} style={{ fontSize:10, color:"#9ca3af" }}>All</button>
            </div>
            {loading ? <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-7 rounded-2xl animate-pulse" style={{ background:"rgba(255,255,255,0.4)" }}/>)}</div>
            : topSrc.length===0 ? <p style={{ fontSize:10, color:"#9ca3af", textAlign:"center", padding:"12px 0" }}>No sources yet</p>
            : topSrc.map(([name,count],i)=>{
              const c=["#2563eb","#7c3aed","#059669"][i];
              return (
                <div key={name} className="mb-2.5 last:mb-0">
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize:10, fontWeight:600, color:"#374151" }} className="truncate max-w-[120px]">{name}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:c }}>{count}</span>
                  </div>
                  <div style={{ height:4, borderRadius:99, background:"rgba(0,0,0,0.06)", overflow:"hidden" }}>
                    <div style={{ width:`${(count/topSrc[0][1])*100}%`, height:"100%", borderRadius:99, background:c }}/>
                  </div>
                </div>
              );
            })}
          </Glass>

          <Glass className="p-3.5 flex-1 min-h-0 overflow-hidden">
            <p style={{ fontSize:11, fontWeight:700, color:"#111827", marginBottom:10 }}>Pipeline</p>
            {analyses.slice(0,5).map((a,i)=>(
              <div key={a.id} className="flex items-start gap-2 mb-2.5 last:mb-0">
                <div className="flex flex-col items-center shrink-0 pt-1">
                  <div style={{ width:6, height:6, borderRadius:"50%", background:i===0?"#2563eb":"#e5e7eb", flexShrink:0 }}/>
                  {i<4&&<div style={{ width:1, height:20, background:"rgba(229,231,235,0.8)", marginTop:2 }}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize:10, fontWeight:600, color:"#374151" }} className="truncate">{a.post?.source?.name??"Unknown"}</p>
                  <p style={{ fontSize:9, color:"#9ca3af" }}>{a.created_at?timeAgo(a.created_at):""}</p>
                </div>
                {a.score!=null&&<span style={{ fontSize:9, fontWeight:700, color:a.score>=7?"#15803d":"#6b7280", flexShrink:0 }}>{a.score}</span>}
              </div>
            ))}
            {!loading&&analyses.length===0&&<p style={{ fontSize:10, color:"#9ca3af", textAlign:"center", paddingTop:16 }}>No activity yet</p>}
          </Glass>

          <Glass className="p-3.5 shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <p style={{ fontSize:11, fontWeight:700, color:"#111827" }}>Ideas</p>
              <button onClick={()=>router.push("/dashboard/ideas")} style={{ fontSize:10, color:"#9ca3af" }}>All</button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { l:"Draft",   v:ideas.filter(i=>i.status==="draft").length,    c:"#6b7280", bg:"rgba(107,114,128,0.08)" },
                { l:"Ready",   v:ideas.filter(i=>i.status==="approved").length, c:"#15803d", bg:"rgba(21,128,61,0.10)"  },
                { l:"Total",   v:ideas.length,                                  c:"#1d4ed8", bg:"rgba(29,78,216,0.10)"  },
              ].map(({ l, v, c, bg })=>(
                <div key={l} style={{ background:bg, borderRadius:14, padding:"8px 6px", textAlign:"center" }}>
                  <p style={{ fontSize:8, color:c, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" }}>{l}</p>
                  <p style={{ fontSize:18, fontWeight:900, color:c, lineHeight:1.1 }}>{loading?"—":v}</p>
                </div>
              ))}
            </div>
          </Glass>
        </div>
      </div>
    </div>
  );
}
