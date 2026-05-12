"use client";

import { useState, useEffect, useMemo, memo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useUser } from "./UserContext";


// ─── Types ────────────────────────────────────────────────────────────────────
interface Source   { id: string; name: string; platform?: string; created_at?: string }
interface Post     { id: string; created_at?: string }
interface Analysis { id: string; score?: number; created_at?: string; post?: { source?: { name?: string } } }
interface Idea     { id: string; status?: string; headline?: string; created_at?: string }

function fmt(n: number) { return n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n); }
function timeAgo(iso: string) {
  const d = Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if (d<60) return `${d}s ago`; if (d<3600) return `${Math.floor(d/60)}m ago`;
  if (d<86400) return `${Math.floor(d/3600)}h ago`; return `${Math.floor(d/86400)}d ago`;
}

// ─── Cinematic Unsplash scene photos ─────────────────────────────────────────
// Each URL is a specific Unsplash photo — consistent on every load
const SCENES: Record<string, { url: string; overlay: string }> = {
  ads:      { url:"https://images.unsplash.com/photo-1540655037529-dec987208707?w=800&q=80&fit=crop", overlay:"rgba(30,58,138,0.45)" },   // camera / filmmaker
  analysis: { url:"https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80&fit=crop", overlay:"rgba(15,23,42,0.5)"  },   // data dashboard night
  ideas:    { url:"https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=800&q=80&fit=crop", overlay:"rgba(120,85,0,0.4)"   },   // lightbulb / creative
  sources:  { url:"https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80&fit=crop", overlay:"rgba(5,78,43,0.45)"  },   // aerial city network
  ugc:      { url:"https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80&fit=crop", overlay:"rgba(90,40,10,0.4)"  },   // creator with phone
  social:   { url:"https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80&fit=crop", overlay:"rgba(60,20,90,0.42)" },   // people / social vibe
  brand:    { url:"https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80&fit=crop", overlay:"rgba(3,60,100,0.45)" },   // typewriter / writing
  settings: { url:"https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80&fit=crop", overlay:"rgba(20,20,20,0.5)"  },   // circuit / technical
  team:     { url:"https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80&fit=crop", overlay:"rgba(30,30,80,0.42)" },   // team collaboration
};

function CinematicScene({ id }: { id: string }) {
  const s = SCENES[id];
  if (!s) return <div className="w-full h-full rounded-xl bg-gray-100" />;
  return (
    <div className="w-full h-full relative overflow-hidden rounded-xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={s.url}
        alt=""
        className="w-full h-full object-cover"
        style={{ filter:"grayscale(20%) contrast(1.05)", transition:"transform 400ms ease" }}
        loading="lazy"
      />
      {/* Cinematic colour overlay */}
      <div className="absolute inset-0 rounded-xl" style={{ background: s.overlay }} />
      {/* Subtle vignette */}
      <div className="absolute inset-0 rounded-xl"
        style={{ background:"radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)" }} />
    </div>
  );
}

// Aliases so the rest of the file doesn't change
const AdStudioScene    = memo(() => <CinematicScene id="ads"      />);
const IntelligenceScene= memo(() => <CinematicScene id="analysis" />);
const IdeasScene       = memo(() => <CinematicScene id="ideas"    />);
const SourcesScene     = memo(() => <CinematicScene id="sources"  />);
const SocialScene      = memo(() => <CinematicScene id="social"   />);
const UGCScene         = memo(() => <CinematicScene id="ugc"      />);
const BrandScene       = memo(() => <CinematicScene id="brand"    />);
const SettingsScene    = memo(() => <CinematicScene id="settings" />);
const TeamScene        = memo(() => <CinematicScene id="team"     />);

// ─── Heatmap scene ────────────────────────────────────────────────────────────
function HeatmapScene({ analyses }: { analyses: Analysis[] }) {
  const weeks = 14;
  const now   = new Date();
  const counts: Record<string,number> = {};
  for (const a of analyses) {
    if (!a.created_at) continue;
    const d = a.created_at.split("T")[0];
    counts[d] = (counts[d]??0)+1;
  }
  const cells = [];
  for (let w=weeks-1;w>=0;w--)
    for (let d=0;d<7;d++) {
      const dt=new Date(now); dt.setDate(now.getDate()-w*7-(6-d));
      const key=dt.toISOString().split("T")[0];
      cells.push({ count:counts[key]??0 });
    }
  return (
    <div className="grid gap-0.5 w-full h-full" style={{ gridTemplateColumns:`repeat(${weeks},1fr)`, gridTemplateRows:"repeat(7,1fr)" }}>
      {cells.map((c,i) => (
        <div key={i} className="rounded-sm" style={{ background:c.count===0?"#f3f4f6":`rgba(37,99,235,${Math.min(.2+c.count*.2,.9)})` }} />
      ))}
    </div>
  );
}

// ─── Weekly bars scene ────────────────────────────────────────────────────────
function WeeklyBarsScene({ analyses }: { analyses: Analysis[] }) {
  const labels=["Mo","Tu","We","Th","Fr","Sa","Su"];
  const now=new Date(); const dow=now.getDay();
  const counts=labels.map((_,i)=>{
    const target=(i+1)%7; const dt=new Date(now);
    dt.setDate(now.getDate()-((dow-target+7)%7));
    return analyses.filter(a=>a.created_at?.startsWith(dt.toISOString().split("T")[0])).length;
  });
  const max=Math.max(...counts,1);
  return (
    <div className="flex items-end gap-1 h-full w-full">
      {counts.map((c,i)=>(
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t" style={{ height:`${Math.max((c/max)*100,4)}%`, background:c>0?"#2563eb":"#e5e7eb", minHeight:3 }} />
          <span className="text-[7px] text-gray-400">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Collage card — CSS-only hover, no useState/Framer Motion ────────────────
function CollageCard({
  onNavigate, children, accent, label, sub,
}: {
  onNavigate?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
  accent?: string;
  label: string;
  sub?: string;
}) {
  return (
    <div
      onClick={onNavigate}
      className={`collage-card bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col h-full${onNavigate ? " collage-card--nav" : ""}`}>
      <div className="flex-1 p-3 min-h-0">{children}</div>
      <div className="px-3 pb-3 pt-1 flex items-center justify-between shrink-0">
        <div>
          <p className="text-xs font-black text-gray-900">{label}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {onNavigate && accent && (
          <div className="collage-arrow w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ background: accent }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5h6M5 2l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stat card (no scene, just numbers) ───────────────────────────────────────
function StatCard({ label, value, trend, sub }: { label:string; value:string|number; trend?:string; sub?:string }) {
  return (
    <div className="flex flex-col justify-between h-full p-4 bg-white rounded-2xl border border-gray-100" style={{ boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">{label}</p>
      <div>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-black text-gray-900 leading-none">{value}</p>
          {trend && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full mb-0.5">{trend}</span>}
        </div>
        {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Competitors list card ────────────────────────────────────────────────────
function CompetitorsCard({ sources, loading, onView }: { sources:Source[]; loading:boolean; onView:()=>void }) {
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <p className="text-xs font-black text-gray-900">Competitors</p>
        <button onClick={onView} className="text-[10px] text-blue-500 font-semibold hover:underline">View all</button>
      </div>
      <div className="flex-1 overflow-hidden px-2 pb-2">
        {loading ? (
          <div className="space-y-2 px-2">{[1,2,3,4].map(i=><div key={i} className="h-7 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
        ) : sources.length===0 ? (
          <p className="text-xs text-gray-400 text-center pt-4">No competitors yet</p>
        ) : (
          <div className="space-y-0.5">
            {sources.slice(0,5).map(s=>(
              <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0"
                  style={{ background:`hsl(${(s.name.charCodeAt(0)*47)%360},55%,50%)` }}>{s.name[0].toUpperCase()}</div>
                <p className="text-[11px] font-semibold text-gray-700 truncate">{s.name}</p>
                {s.platform && <span className="text-[9px] text-gray-400 shrink-0">{s.platform}</span>}
              </div>
            ))}
            {sources.length>5&&<p className="text-[10px] text-blue-500 font-semibold pl-4 pt-1">+{sources.length-5} more</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ideas list card ──────────────────────────────────────────────────────────
function IdeasCard({ ideas, loading, onView }: { ideas:Idea[]; loading:boolean; onView:()=>void }) {
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <p className="text-xs font-black text-gray-900">Recent Ideas</p>
        <button onClick={onView} className="text-[10px] text-blue-500 font-semibold hover:underline">View all</button>
      </div>
      <div className="flex-1 px-4 pb-3 overflow-hidden">
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-5 bg-gray-100 rounded animate-pulse"/>)}</div>
        ) : ideas.length===0 ? (
          <p className="text-xs text-gray-400 pt-2">No ideas yet</p>
        ) : (
          <div className="space-y-2">
            {ideas.slice(0,4).map(idea=>(
              <div key={idea.id} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background:idea.status==="approved"?"#16a34a":"#d1d5db" }} />
                <p className="text-[11px] text-gray-600 leading-snug line-clamp-1">{idea.headline??"Untitled"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Coverage bar card ────────────────────────────────────────────────────────
function CoverageCard({ analyses, sources, posts }: { analyses:Analysis[]; sources:Source[]; posts:Post[] }) {
  const avgScore = analyses.length>0 ? (analyses.reduce((s,a)=>s+(a.score??0),0)/analyses.length).toFixed(1) : null;
  const pct = analyses.length>0 ? Math.min(Math.round((analyses.length/Math.max(posts.length,1))*100),100) : 0;
  return (
    <div className="flex flex-col justify-between h-full bg-white rounded-2xl border border-gray-100 p-4" style={{ boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
      <p className="text-xs font-black text-gray-900 mb-3">Pipeline</p>
      <div className="space-y-2.5">
        <div className="flex justify-between text-[11px]">
          <span className="text-gray-500">Competitors</span><span className="font-black text-gray-900">{sources.length}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span className="text-gray-500">Avg score</span><span className="font-black text-gray-900">{avgScore?`${avgScore}/10`:"—"}</span>
        </div>
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-gray-500">Coverage</span><span className="font-black text-gray-900">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-amber-400" style={{ width:`${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Zoom transition type ─────────────────────────────────────────────────────
type ZoomTarget = { rect: DOMRect; accent: string; href: string } | null;

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router  = useRouter();
  const user    = useUser();

  const [sources,  setSources]  = useState<Source[]>([]);
  const [posts,    setPosts]    = useState<Post[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [ideas,    setIdeas]    = useState<Idea[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [zoom,     setZoom]     = useState<ZoomTarget>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/sources").then(r=>r.json()).catch(()=>({})),
      fetch("/api/posts").then(r=>r.json()).catch(()=>({})),
      fetch("/api/analysis").then(r=>r.json()).catch(()=>({})),
      fetch("/api/ideas").then(r=>r.json()).catch(()=>({})),
    ]).then(([s,p,a,i]) => {
      setSources(s?.sources??[]); setPosts(p?.posts??[]);
      setAnalyses(a?.analysis??[]); setIdeas(i?.ideas??[]);
      setLoading(false);
    });
  }, []);

  const today         = useMemo(() => new Date().toISOString().split("T")[0], []);
  const todayAnalyses = useMemo(() => analyses.filter(a=>a.created_at?.startsWith(today)).length, [analyses, today]);
  const lastRun       = useMemo(() => [...analyses].sort((a,b)=>new Date(b.created_at??0).getTime()-new Date(a.created_at??0).getTime())[0], [analyses]);

  // Capture bounding rect → zoom overlay → navigate
  function zoomTo(e: React.MouseEvent<HTMLDivElement>, href: string, accent = "#2563eb") {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setZoom({ rect, accent, href });
    setTimeout(() => router.push(href), 420);
  }

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });

  // Header slides up and fades out over the first 80px of scroll
  const headerY       = useTransform(scrollY, [0, 80], [0, -48]);
  const headerOpacity = useTransform(scrollY, [0, 60], [1, 0]);
  const headerScale   = useTransform(scrollY, [0, 80], [1, 0.95]);

  const nav = (href: string, accent = "#2563eb") =>
    (e: React.MouseEvent<HTMLDivElement>) => zoomTo(e, href, accent);

  return (
    <div className="h-screen overflow-hidden" style={{ background:"#f8f9fb" }}>

      {/* Collage card hover styles */}
      <style>{`
        .collage-card { box-shadow:0 1px 4px rgba(0,0,0,0.06); transition:transform 180ms ease,box-shadow 180ms ease; }
        .collage-card--nav { cursor:pointer; }
        .collage-card--nav:hover { transform:translateY(-2px) scale(1.01); box-shadow:0 8px 28px rgba(0,0,0,0.12); }
        .collage-arrow { opacity:0; transform:translateX(4px); transition:opacity 150ms ease,transform 150ms ease; }
        .collage-card--nav:hover .collage-arrow { opacity:1; transform:translateX(0); }
        .collage-card--nav:hover img { transform:scale(1.04); }
      `}</style>

      {/* ── Zoom overlay ── */}
      <AnimatePresence>
        {zoom && (
          <motion.div
            key="zoom"
            initial={{
              position:     "fixed" as const,
              left:  zoom.rect.left,
              top:   zoom.rect.top,
              width: zoom.rect.width,
              height:zoom.rect.height,
              borderRadius: 18,
              zIndex: 9999,
              background: zoom.accent,
              opacity: 0.85,
            }}
            animate={{
              left:   0, top:    0,
              width:  "100vw", height: "100vh",
              borderRadius: 0,
              opacity: 1,
            }}
            transition={{ duration: 0.38, ease: [0.4, 0, 0.15, 1] }}
          />
        )}
      </AnimatePresence>

      {/* ── Scrollable container ── */}
      <div ref={scrollRef} className="h-full overflow-y-auto">

        {/* Header — lives inside scroll, swipes up only when user scrolls */}
        <motion.div
          className="px-6 pt-5 pb-3"
          style={{ y: headerY, opacity: headerOpacity, scale: headerScale, transformOrigin: "top left" }}>
          <h1 className="text-xl font-black text-gray-900">
            {user?.display_name ? `Welcome back, ${user.display_name.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date().toLocaleDateString("en-US",{ weekday:"long", month:"long", day:"numeric" })}
            {lastRun?.created_at && ` · Last run ${timeAgo(lastRun.created_at)}`}
          </p>
        </motion.div>

      {/* ── Unified collage grid ── */}
      <div className="px-6 pb-6 grid gap-3" style={{
        gridTemplateColumns: "repeat(12, 1fr)",
        gridTemplateRows:    "200px 160px 150px 130px",
      }}>

        {/* Row 1 ─────────────────────────────────────────────── */}

        {/* Ad Studio — hero, spans 2 rows */}
        <div style={{ gridColumn:"1/6", gridRow:"1/3" }}>
          <CollageCard onNavigate={nav("/dashboard/ads","#7c3aed")} accent="#7c3aed" label="Ad Studio" sub="Reference → rendered ad">
            <AdStudioScene />
          </CollageCard>
        </div>

        {/* Intelligence */}
        <div style={{ gridColumn:"6/10", gridRow:"1/2" }}>
          <CollageCard onNavigate={nav("/dashboard/analysis","#2563eb")} accent="#2563eb" label="Intelligence" sub="Competitor insights">
            <IntelligenceScene />
          </CollageCard>
        </div>

        {/* Daily analyses stat */}
        <div style={{ gridColumn:"10/13", gridRow:"1/2" }}>
          <StatCard label="Analyses today" value={loading?"—":todayAnalyses}
            trend={todayAnalyses>0?`+${todayAnalyses}`:undefined} sub={`${loading?"—":fmt(analyses.length)} total`} />
        </div>

        {/* Row 2 ─────────────────────────────────────────────── */}

        {/* Sources network */}
        <div style={{ gridColumn:"6/9", gridRow:"2/3" }}>
          <CollageCard onNavigate={nav("/dashboard/sources","#059669")} accent="#059669" label="Sources" sub="Track competitors">
            <SourcesScene />
          </CollageCard>
        </div>

        {/* Competitors list */}
        <div style={{ gridColumn:"9/13", gridRow:"2/3" }}>
          <CompetitorsCard sources={sources} loading={loading} onView={() => router.push("/dashboard/sources")} />
        </div>

        {/* Row 3 ─────────────────────────────────────────────── */}

        {/* Activity heatmap */}
        <div style={{ gridColumn:"1/4", gridRow:"3/4" }}>
          <CollageCard label="Activity" sub="Pipeline runs">
            <HeatmapScene analyses={analyses} />
          </CollageCard>
        </div>

        {/* Ideas list */}
        <div style={{ gridColumn:"4/7", gridRow:"3/4" }}>
          <IdeasCard ideas={ideas} loading={loading} onView={() => router.push("/dashboard/ideas")} />
        </div>

        {/* UGC */}
        <div style={{ gridColumn:"7/10", gridRow:"3/4" }}>
          <CollageCard onNavigate={nav("/dashboard/ugc","#ea580c")} accent="#ea580c" label="UGC Creators" sub="Find creators">
            <UGCScene />
          </CollageCard>
        </div>

        {/* Social */}
        <div style={{ gridColumn:"10/13", gridRow:"3/4" }}>
          <CollageCard onNavigate={nav("/dashboard/social","#7c3aed")} accent="#7c3aed" label="Social" sub="Connected accounts">
            <SocialScene />
          </CollageCard>
        </div>

        {/* Row 4 ─────────────────────────────────────────────── */}

        {/* Ideas scene */}
        <div style={{ gridColumn:"1/4", gridRow:"4/5" }}>
          <CollageCard onNavigate={nav("/dashboard/ideas","#ca8a04")} accent="#ca8a04" label="Ideas" sub="AI content concepts">
            <IdeasScene />
          </CollageCard>
        </div>

        {/* Brand Prompt */}
        <div style={{ gridColumn:"4/7", gridRow:"4/5" }}>
          <CollageCard onNavigate={nav("/dashboard/brand-prompt","#0284c7")} accent="#0284c7" label="Brand Prompt" sub="Train AI on your voice">
            <BrandScene />
          </CollageCard>
        </div>

        {/* Pipeline coverage */}
        <div style={{ gridColumn:"7/10", gridRow:"4/5" }}>
          <CoverageCard analyses={analyses} sources={sources} posts={posts} />
        </div>

        {/* Weekly chart */}
        <div style={{ gridColumn:"10/11", gridRow:"4/5" }}>
          <CollageCard label="Week" sub="Daily usage">
            <WeeklyBarsScene analyses={analyses} />
          </CollageCard>
        </div>

        {/* Settings */}
        <div style={{ gridColumn:"11/12", gridRow:"4/5" }}>
          <CollageCard onNavigate={nav("/dashboard/settings","#6b7280")} accent="#6b7280" label="Settings" sub="Account">
            <SettingsScene />
          </CollageCard>
        </div>

        {/* Team */}
        <div style={{ gridColumn:"12/13", gridRow:"4/5" }}>
          <CollageCard onNavigate={nav("/dashboard/team","#4f46e5")} accent="#4f46e5" label="Team" sub="Members">
            <TeamScene />
          </CollageCard>
        </div>

      </div>{/* end collage grid */}
      </div>{/* end scrollable container */}
    </div>
  );
}
