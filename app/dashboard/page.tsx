"use client";

import { useState, useEffect, memo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "./UserContext";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Analysis { id: string; score?: number; created_at?: string }
interface Idea     { id: string; status?: string; headline?: string; created_at?: string }
interface Source   { id: string; name: string; created_at?: string }

function fmt(n: number) { return n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n); }

// ─── Section cards config ─────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: "ads",
    label: "Ad Studio",
    desc: "Turn reference ads into your own.",
    href: "/dashboard/ads",
    gradient: "linear-gradient(135deg,#1d4ed8 0%,#7c3aed 100%)",
    photo: "https://images.unsplash.com/photo-1540655037529-dec987208707?w=600&q=75&fit=crop",
  },
  {
    id: "analysis",
    label: "Intelligence",
    desc: "Competitor hooks, trends & gaps.",
    href: "/dashboard/analysis",
    gradient: "linear-gradient(135deg,#0f172a 0%,#1e40af 100%)",
    photo: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=75&fit=crop",
  },
  {
    id: "ideas",
    label: "Ideas",
    desc: "AI-generated content concepts.",
    href: "/dashboard/ideas",
    gradient: "linear-gradient(135deg,#92400e 0%,#d97706 100%)",
    photo: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=600&q=75&fit=crop",
  },
  {
    id: "sources",
    label: "Sources",
    desc: "Accounts you're tracking.",
    href: "/dashboard/sources",
    gradient: "linear-gradient(135deg,#064e3b 0%,#059669 100%)",
    photo: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&q=75&fit=crop",
  },
  {
    id: "ugc",
    label: "UGC Creators",
    desc: "Manage your creator pipeline.",
    href: "/dashboard/ugc",
    gradient: "linear-gradient(135deg,#7c2d12 0%,#ea580c 100%)",
    photo: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=75&fit=crop",
  },
  {
    id: "social",
    label: "Social",
    desc: "Connected accounts & tracking.",
    href: "/dashboard/social",
    gradient: "linear-gradient(135deg,#4c1d95 0%,#7c3aed 100%)",
    photo: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=75&fit=crop",
  },
];

// ─── Section card ─────────────────────────────────────────────────────────────
type ZoomTarget = { rect: DOMRect; gradient: string } | null;

const SectionCard = memo(function SectionCard({
  s, onZoom,
}: {
  s: typeof SECTIONS[number];
  onZoom: (e: React.MouseEvent<HTMLDivElement>, gradient: string) => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={e => onZoom(e, s.gradient)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative overflow-hidden rounded-3xl cursor-pointer"
      style={{
        height: 160,
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: hover
          ? "0 20px 48px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.9)"
          : "0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
        transform: hover ? "translateY(-3px) scale(1.01)" : "none",
        transition: "all 220ms cubic-bezier(0.34,1.56,0.64,1)",
      }}>

      {/* Photo + gradient overlay */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.photo} alt="" className="w-full h-full object-cover opacity-20"
          style={{ transition:"transform 300ms ease", transform: hover ? "scale(1.06)" : "scale(1)" }} />
        <div className="absolute inset-0" style={{ background: s.gradient, opacity: 0.15 }} />
      </div>

      {/* Content */}
      <div className="relative z-10 p-5 h-full flex flex-col justify-between">
        <div>
          <p className="text-[13px] font-black text-gray-900 mb-1">{s.label}</p>
          <p className="text-[11px] text-gray-500 leading-snug">{s.desc}</p>
        </div>
        <div className="flex items-center justify-end">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: s.gradient, opacity: hover ? 1 : 0, transition:"opacity 180ms ease", boxShadow:"0 4px 12px rgba(0,0,0,0.2)" }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5h6M5 2l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return (
    <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{label}</p>
        <p className="text-xl font-black text-gray-900 mt-0.5">{value}</p>
      </div>
      {trend && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ background:"#dcfce7", color:"#15803d" }}>
          {trend}
        </span>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router  = useRouter();
  const user    = useUser();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [ideas,    setIdeas]    = useState<Idea[]>([]);
  const [sources,  setSources]  = useState<Source[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [zoom,     setZoom]     = useState<ZoomTarget>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/analysis").then(r=>r.json()).catch(()=>({})),
      fetch("/api/ideas").then(r=>r.json()).catch(()=>({})),
      fetch("/api/sources").then(r=>r.json()).catch(()=>({})),
    ]).then(([a,i,s]) => {
      setAnalyses(a?.analysis??[]);
      setIdeas(i?.ideas??[]);
      setSources(s?.sources??[]);
      setLoading(false);
    });
  }, []);

  const today    = new Date().toISOString().split("T")[0];
  const todayAna = analyses.filter(a=>a.created_at?.startsWith(today)).length;
  const approved = ideas.filter(i=>i.status==="approved").length;

  const hour  = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name  = user?.display_name?.split(" ")[0] ?? "there";

  function zoomTo(e: React.MouseEvent<HTMLDivElement>, gradient: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setZoom({ rect, gradient });
    const href = SECTIONS.find(s =>
      (e.currentTarget as HTMLElement).textContent?.includes(s.label)
    )?.href;
    setTimeout(() => { if (href) router.push(href); }, 380);
  }

  return (
    <div className="min-h-screen px-8 py-8">

      {/* Zoom overlay */}
      <AnimatePresence>
        {zoom && (
          <motion.div key="zoom" style={{ position:"fixed", zIndex:9999, background:zoom.gradient }}
            initial={{ left:zoom.rect.left, top:zoom.rect.top, width:zoom.rect.width, height:zoom.rect.height, borderRadius:24, opacity:0.9 }}
            animate={{ left:0, top:0, width:"100vw", height:"100vh", borderRadius:0, opacity:1 }}
            transition={{ duration:0.38, ease:[0.4,0,0.15,1] }} />
        )}
      </AnimatePresence>

      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          {greeting}, {name}.
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {new Date().toLocaleDateString("en-US",{ weekday:"long", month:"long", day:"numeric" })}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatPill label="Analyses" value={loading?"—":fmt(analyses.length)} trend={todayAna>0?`+${todayAna} today`:undefined} />
        <StatPill label="Ideas" value={loading?"—":fmt(ideas.length)} />
        <StatPill label="Approved" value={loading?"—":String(approved)} />
        <StatPill label="Sources" value={loading?"—":String(sources.length)} />
      </div>

      {/* Section grid */}
      <div className="grid grid-cols-3 gap-4">
        {SECTIONS.map(s => (
          <SectionCard key={s.id} s={s} onZoom={(e) => zoomTo(e, s.gradient)} />
        ))}
      </div>

    </div>
  );
}
