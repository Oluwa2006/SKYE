"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { CircleNotch, ArrowRight, Check, LockOpen, MagnifyingGlass, Sparkle, ChartBar, Target, TrendUp, Lightbulb, Users, FilmStrip } from "@phosphor-icons/react";

// ─── Slide transition ─────────────────────────────────────────────────────────
const SV = {
  enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface CR { name:string; type:"direct"|"aspirational"|"creator"|"aesthetic"; why:string; content_style:string; threat_level:"high"|"medium"|"low"; }
interface DR { category:string; positioning:string; competitors:CR[]; content_opportunities:string[]; hook_themes:string[]; }
const TL: Record<string,string> = { direct:"Direct", aspirational:"Aspirational", creator:"Creator-style", aesthetic:"Aesthetic" };
const TC: Record<string,string> = { high:"#dc2626", medium:"#d97706", low:"#16a34a" };

const FEATURES = [
  { icon: ChartBar,  label:"Competitor Analysis",  sub:"Track every move they make across every channel." },
  { icon: Target,    label:"Hook Intelligence",     sub:"Find the exact words that stop the scroll." },
  { icon: TrendUp,   label:"Trend Detection",       sub:"Catch waves before they peak in your niche." },
  { icon: Lightbulb, label:"Creative Concepts",     sub:"AI-generated ideas tailored to your brand voice." },
  { icon: Users,     label:"Audience Mapping",      sub:"Understand who your customers really are." },
  { icon: FilmStrip, label:"Ad Studio",             sub:"Render professional video ads in minutes." },
];

const iCls = "w-full rounded-[10px] border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 text-sm px-4 py-3 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm";

// ─── Step 0: Hero — matches reference exactly ─────────────────────────────────
function StepHero({ onStart }: { onStart: () => void }) {
  const [m, setM] = useState(false);
  useEffect(() => { setTimeout(() => setM(true), 60); }, []);

  return (
    <div className="w-full" style={{ background:"#f5f6f8" }}>
      <div className="max-w-4xl mx-auto px-6">

        {/* Headline + CTAs */}
        <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:m?1:0, y:m?0:24 }}
          transition={{ duration:0.7, ease:[0.22,1,0.36,1] }}
          className="text-center pt-16 pb-10">
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight tracking-tight mb-4">
            Train AI on your<br />competitive market.
          </h1>
          <p className="text-base text-gray-500 max-w-md mx-auto leading-relaxed mb-8">
            Automate competitive research with intelligent AI analysis designed for real-time, natural insights.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={onStart}
              className="px-6 py-2.5 rounded-lg text-sm font-bold transition-all hover:opacity-90"
              style={{ background:"#2563eb", color:"#fff" }}>
              Start Analysis
            </button>
            <button
              className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 transition-all hover:bg-gray-50">
              How It Works
            </button>
          </div>
        </motion.div>

        {/* Blue gradient card — the key visual from the reference */}
        <motion.div initial={{ opacity:0, y:36 }} animate={{ opacity:m?1:0, y:m?0:36 }}
          transition={{ delay:0.2, duration:0.8, ease:[0.22,1,0.36,1] }}>
          <div className="relative rounded-[24px] overflow-hidden"
            style={{
              background:"linear-gradient(180deg,#dbeafe 0%,#93c5fd 20%,#3b82f6 45%,#2563eb 60%,#1d4ed8 75%,#1e40af 100%)",
              boxShadow:"0 20px 60px rgba(37,99,235,0.25), 0 4px 12px rgba(0,0,0,0.08)",
              minHeight:320,
            }}>

            {/* Grid dot pattern */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.15) 1px,transparent 1px)",
                backgroundSize:"24px 24px",
              }} />

            {/* Radial glow from top center */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                width:600, height:300,
                background:"radial-gradient(ellipse at top center,rgba(255,255,255,0.25) 0%,transparent 70%)",
              }} />

            {/* Mock dashboard content inside the card */}
            <div className="relative z-10 p-8 sm:p-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-blue-200 text-[10px] font-semibold uppercase tracking-widest mb-1">Live Intelligence Dashboard</p>
                  <p className="text-white text-lg font-bold">Your competitive landscape, live.</p>
                </div>
                <div className="flex gap-2">
                  <div className="px-3 py-1 rounded-full text-[10px] font-bold" style={{ background:"rgba(255,255,255,0.15)", color:"#fff" }}>Real-time</div>
                  <div className="px-3 py-1 rounded-full text-[10px] font-bold" style={{ background:"rgba(255,255,255,0.15)", color:"#fff" }}>Automated</div>
                </div>
              </div>

              {/* Mock stat row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[["47", "Competitors tracked"], ["1.2K", "Hooks analysed"], ["94", "Concepts ready"]].map(([val, label]) => (
                  <div key={label} className="rounded-[14px] p-4"
                    style={{ background:"rgba(255,255,255,0.12)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.18)" }}>
                    <p className="text-white text-2xl font-black">{val}</p>
                    <p className="text-blue-200 text-[10px] mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* Mock bar chart */}
              <div className="rounded-[14px] p-4"
                style={{ background:"rgba(255,255,255,0.1)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.14)" }}>
                <p className="text-blue-200 text-[10px] font-semibold mb-3">Competitor content volume</p>
                <div className="flex items-end gap-2 h-12">
                  {[55,80,45,90,60,75,40,85,65,95,50,70].map((h,i) => (
                    <div key={i} className="flex-1 rounded-sm" style={{ height:`${h}%`,
                      background: i===11?"#fff":"rgba(255,255,255,0.3)" }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Conveyor belt stats */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:m?1:0 }} transition={{ delay:0.5, duration:0.8 }}
          className="py-10 overflow-hidden">
          <style>{`
            @keyframes belt { from { transform: translateX(0); } to { transform: translateX(-50%); } }
            .belt-track { display: flex; gap: 16px; width: max-content; animation: belt 28s linear infinite; }
            .belt-track:hover { animation-play-state: paused; }
          `}</style>

          <div className="relative">
            {/* Left fade */}
            <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
              style={{ background:"linear-gradient(to right,#f5f6f8,transparent)" }} />
            {/* Right fade */}
            <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
              style={{ background:"linear-gradient(to left,#f5f6f8,transparent)" }} />

            <div className="belt-track">
              {[...Array(2)].flatMap((_, copy) => [
                { stat:"2.4M+",  label:"Competitor posts analysed",  sub:"TikTok, Instagram & YouTube"     },
                { stat:"94%",    label:"Better creative output",      sub:"reported by teams after 30 days" },
                { stat:"< 48h",  label:"Time to first insight",       sub:"from sign-up to actionable data" },
                { stat:"10K+",   label:"Brand profiles mapped",       sub:"and growing every week"          },
                { stat:"3.8×",   label:"Faster content ideation",     sub:"vs manual competitor research"   },
                { stat:"#1",     label:"Hook format identified",      sub:"per niche, updated daily"        },
              ].map(({ stat, label, sub }, i) => (
                <div key={`${copy}-${i}`} className="rounded-[16px] border border-gray-200 bg-white p-5 shadow-sm shrink-0"
                  style={{ width:200 }}>
                  <p className="text-2xl font-black text-gray-900 mb-1">{stat}</p>
                  <p className="text-xs font-bold text-gray-700 mb-0.5">{label}</p>
                  <p className="text-[10px] text-gray-400 leading-snug">{sub}</p>
                </div>
              )))}
            </div>
          </div>
        </motion.div>

        {/* Features section */}
        <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:m?1:0, y:m?0:24 }}
          transition={{ delay:0.6, duration:0.8 }} className="pb-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3 leading-tight">
              AI that gets your<br />market intelligence done.
            </h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
              From uncovering competitor strategies to generating winning creative concepts, Agentica handles intelligence so you can focus on execution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            {FEATURES.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="space-y-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background:"#eff6ff", border:"1px solid #dbeafe" }}>
                  <Icon size={18} weight="duotone" style={{ color:"#2563eb" }} />
                </div>
                <p className="text-sm font-bold text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{sub}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button onClick={onStart}
              className="px-8 py-3 rounded-lg text-sm font-bold transition-all hover:opacity-90"
              style={{ background:"#2563eb", color:"#fff" }}>
              Start for free
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Step 1: Company Input ────────────────────────────────────────────────────
function StepCompanyInput({ onNext }: { onNext: (d: Record<string,string>) => void }) {
  const [form, setForm] = useState({ company_name:"", website:"", description:"", audience:"", goals:"" });
  const [researching,   setResearching]   = useState(false);
  const [researchDone,  setResearchDone]  = useState(false);
  const [researchError, setResearchError] = useState("");
  const [confidence,    setConfidence]    = useState<"high"|"medium"|"low"|null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [k]: e.target.value })); setResearchDone(false);
  };
  const canResearch = (form.website.trim().length > 3 || form.company_name.trim().length > 1) && !researching;
  const canContinue = form.description.trim().length > 10;

  async function doResearch() {
    setResearching(true); setResearchError(""); setResearchDone(false);
    try {
      const r = await fetch("/api/onboard/research-company", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ url:form.website, company_name:form.company_name }),
      });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error ?? "Research failed");
      setForm({ company_name:d.company_name||form.company_name, website:d.website||form.website,
        description:d.description||form.description, audience:d.audience||form.audience, goals:d.goals||form.goals });
      setConfidence(d.confidence ?? null); setResearchDone(true);
    } catch(e) { setResearchError((e as Error).message); }
    finally { setResearching(false); }
  }

  return (
    <div className="w-full max-w-lg space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-1">Step 1 of 3</p>
        <h2 className="text-3xl font-black text-gray-900">Tell us about your business</h2>
        <p className="text-sm text-gray-500 mt-1">Fill in manually — or let AI research your company instantly.</p>
      </div>

      <div className="rounded-[14px] overflow-hidden border border-blue-100" style={{ background:"#eff6ff" }}>
        <div className="px-4 py-2.5 flex items-center gap-2 border-b border-blue-100">
          <Sparkle size={13} weight="fill" style={{ color:"#2563eb" }} />
          <p className="text-xs font-semibold text-blue-700">Already a public brand? Let AI fill this in.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 bg-white">
          <MagnifyingGlass size={15} className="text-gray-400 shrink-0" />
          <input type="text" placeholder="Paste website URL or company name…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 text-gray-800"
            value={form.website || form.company_name}
            onChange={e => { const v=e.target.value; if(v.includes("."))setForm(p=>({...p,website:v})); else setForm(p=>({...p,company_name:v})); setResearchDone(false); }} />
          <button onClick={doResearch} disabled={!canResearch}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold disabled:opacity-40"
            style={{ background:"#2563eb", color:"#fff" }}>
            {researching ? <><CircleNotch size={12} className="animate-spin" /> Researching…</>
              : researchDone ? <><Check size={12} weight="bold" /> Done</> : "Research →"}
          </button>
        </div>
        {researchDone && confidence && (
          <div className="px-4 py-2 flex items-center gap-2 bg-green-50 border-t border-green-100">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <p className="text-[10px] text-green-700 font-medium">
              {confidence==="high"?"Website read — fields pre-filled":confidence==="medium"?"Partial data found — please review":"Inferred from name — please review"}
            </p>
          </div>
        )}
        {researchError && <p className="px-4 py-2 text-[11px] text-red-600 bg-red-50 border-t border-red-100">{researchError}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[11px] font-medium text-gray-400">or fill in manually</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input className={iCls} placeholder="Company name" value={form.company_name} onChange={set("company_name")} />
          <input className={iCls} placeholder="Website" value={form.website} onChange={set("website")} />
        </div>
        <textarea className={iCls} style={{ resize:"none" }} rows={3}
          placeholder={`What do you do? e.g. "AI scheduling tool for college students."`}
          value={form.description} onChange={set("description")} />
        <input className={iCls} placeholder="Target audience" value={form.audience} onChange={set("audience")} />
        <input className={iCls} placeholder="Main goal (e.g. grow social, drive sales)" value={form.goals} onChange={set("goals")} />
      </div>

      <button onClick={() => onNext(form)} disabled={!canContinue}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-[10px] text-sm font-bold transition-all disabled:opacity-40 hover:opacity-90"
        style={{ background:"#2563eb", color:"#fff" }}>
        Discover competitors <ArrowRight size={16} weight="bold" />
      </button>
    </div>
  );
}

// ─── Step 2: Discovery ────────────────────────────────────────────────────────
function StepDiscovery({ companyData, onNext }: { companyData: Record<string,string>; onNext: (r:DR, s:string[]) => void }) {
  const [loading, setLoading] = useState(true);
  const [result,  setResult]  = useState<DR|null>(null);
  const [error,   setError]   = useState<string|null>(null);
  const [selected,setSelected]= useState<string[]>([]);
  const [phase,   setPhase]   = useState(0);
  const PH = ["Parsing your market position…","Identifying competing brands…","Clustering content strategies…","Mapping emotional triggers…","Building your competitive picture…"];

  useEffect(() => {
    const iv = setInterval(() => setPhase(p => (p+1) % PH.length), 1400);
    fetch("/api/onboard/discover-competitors", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(companyData) })
      .then(r=>r.json()).then(d => { clearInterval(iv); if(d.error)setError(d.error); else setResult(d); setLoading(false); })
      .catch(e => { clearInterval(iv); setError(e.message); setLoading(false); });
    return () => clearInterval(iv);
  }, []); // eslint-disable-line

  const toggle = (n: string) => setSelected(p => p.includes(n) ? p.filter(x=>x!==n) : [...p,n]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 max-w-sm mx-auto text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background:"#eff6ff", border:"1px solid #bfdbfe" }}>
        <CircleNotch size={26} className="animate-spin text-blue-600" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Finding your competition</h2>
        <motion.p key={phase} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
          className="text-sm text-gray-500">{PH[phase]}</motion.p>
      </div>
      <div className="flex gap-1.5">
        {PH.map((_,i) => <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background:i===phase?"#2563eb":"#e5e7eb" }} />)}
      </div>
    </div>
  );

  if (error || !result) return (
    <div className="text-center py-16 space-y-3">
      <p className="text-sm text-gray-500">{error}</p>
      <button onClick={() => window.location.reload()} className="text-sm text-blue-600 underline">Try again</button>
    </div>
  );

  return (
    <div className="w-full max-w-2xl space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-1">Step 2 of 3</p>
        <h2 className="text-3xl font-black text-gray-900">Brands competing for your audience</h2>
        <p className="text-sm text-gray-500 mt-1">Category: <span className="font-semibold text-gray-800">{result.category}</span> · {result.positioning}</p>
      </div>

      <div className="rounded-[14px] overflow-hidden border border-gray-200 shadow-sm bg-white">
        <div className="grid grid-cols-12 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 bg-gray-50 border-b border-gray-100">
          <div className="col-span-1" /><div className="col-span-3">Brand</div>
          <div className="col-span-2">Type</div><div className="col-span-5">Why they match</div>
          <div className="col-span-1">Threat</div>
        </div>
        {result.competitors.map((c,i) => {
          const sel = selected.includes(c.name);
          return (
            <button key={i} onClick={() => toggle(c.name)}
              className="w-full grid grid-cols-12 px-4 py-3.5 text-left transition-all hover:bg-blue-50"
              style={{ background:sel?"#eff6ff":"white", borderTop:i>0?"1px solid #f3f4f6":undefined, borderLeft:sel?"3px solid #2563eb":"3px solid transparent" }}>
              <div className="col-span-1 flex items-center">
                <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center"
                  style={{ borderColor:sel?"#2563eb":"#d1d5db", background:sel?"#2563eb":"white" }}>
                  {sel && <Check size={11} weight="bold" className="text-white" />}
                </div>
              </div>
              <div className="col-span-3 flex items-center"><span className="text-sm font-bold" style={{ color:sel?"#1d4ed8":"#111827" }}>{c.name}</span></div>
              <div className="col-span-2 flex items-center">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background:sel?"#dbeafe":"#f3f4f6", color:sel?"#1d4ed8":"#6b7280" }}>{TL[c.type]??c.type}</span>
              </div>
              <div className="col-span-5 flex items-center"><p className="text-xs text-gray-500 leading-snug">{c.why}</p></div>
              <div className="col-span-1 flex items-center"><span className="text-[10px] font-bold capitalize" style={{ color:TC[c.threat_level]??"#111" }}>{c.threat_level}</span></div>
            </button>
          );
        })}
      </div>

      <div className="rounded-[12px] p-4 space-y-2 border border-blue-100 bg-blue-50">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-600">Content gaps your competitors are missing</p>
        {result.content_opportunities.map((o,i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 font-bold text-blue-500">→</span>
            <p className="text-sm text-gray-700">{o}</p>
          </div>
        ))}
      </div>

      <button onClick={() => onNext(result, selected)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-[10px] text-sm font-bold transition-all hover:opacity-90"
        style={{ background:"#2563eb", color:"#fff" }}>
        {selected.length>0?`Study ${selected.length} selected brand${selected.length!==1?"s":""}` : "Continue with all brands"} <ArrowRight size={16} weight="bold" />
      </button>
    </div>
  );
}

// ─── Step 3: Signup Wall ──────────────────────────────────────────────────────
function StepSignupWall({ companyData, discoveryResult, selectedBrands, onSignup }: {
  companyData: Record<string,string>; discoveryResult: DR; selectedBrands: string[]; onSignup: () => void;
}) {
  useEffect(() => {
    try { sessionStorage.setItem("onboarding", JSON.stringify({ companyData, discoveryResult, selectedBrands })); } catch {}
  }, []); // eslint-disable-line

  return (
    <div className="w-full max-w-md space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-1">Step 3 of 3</p>
        <h2 className="text-3xl font-black text-gray-900">Your analysis is ready.</h2>
        <p className="text-base text-gray-500 mt-2 leading-relaxed">
          We mapped <strong className="text-gray-900">{discoveryResult.competitors.length} competing brands</strong> and found{" "}
          <strong className="text-gray-900">{discoveryResult.content_opportunities.length} content gaps</strong> they&apos;re missing.
        </p>
      </div>

      <div className="rounded-[16px] overflow-hidden border border-gray-200 shadow-lg">
        <div className="px-4 py-2.5 flex items-center gap-2 bg-gray-50 border-b border-gray-200">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-3 h-5 rounded bg-white border border-gray-200 flex items-center justify-center">
            <span className="text-[9px] text-gray-400 font-medium">agentica.app/dashboard</span>
          </div>
          <LockOpen size={11} weight="bold" className="text-gray-400" />
        </div>
        <div className="px-4 py-2.5 border-b border-gray-100" style={{ background:"linear-gradient(135deg,#1e3a8a,#2563eb)" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-200">Unlocked in your dashboard</p>
        </div>
        <div className="bg-white divide-y divide-gray-50">
          {["Top-performing hook structures from your competitors","Visual pacing patterns that drive engagement",
            "Emotional positioning map for your market","Trend opportunities and content gaps",
            "AI-generated creative concepts built for your brand"].map((item,i) => (
            <div key={i} className="px-4 py-2.5 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center bg-blue-50 border border-blue-100">
                <Check size={10} weight="bold" className="text-blue-600" />
              </div>
              <p className="text-sm text-gray-700">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <button onClick={onSignup}
          className="w-full py-3 rounded-[10px] text-sm font-bold transition-all hover:opacity-90"
          style={{ background:"#2563eb", color:"#fff" }}>
          Create account to unlock →
        </button>
        <p className="text-center text-xs text-gray-400">Free to start · No credit card required</p>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
type Step = "hero"|"company"|"discovery"|"signup";
const ORDER: Step[] = ["hero","company","discovery","signup"];

export default function LandingPage() {
  const router = useRouter();
  const [step, setStep]               = useState<Step>("hero");
  const [dir,  setDir]                = useState(1);
  const [companyData, setCompanyData] = useState<Record<string,string>>({});
  const [discovery,   setDiscovery]   = useState<DR|null>(null);
  const [selected,    setSelected]    = useState<string[]>([]);

  function go(next: Step) {
    const c = ORDER.indexOf(step), n = ORDER.indexOf(next);
    setDir(n > c ? 1 : -1); setStep(next);
  }

  return (
    <div className="min-h-screen" style={{ background:"#f5f6f8" }}>

      {/* Nav — matches reference exactly */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Image src="/logo-2.png" alt="Agentica" width={24} height={24} className="rounded-md" />
            <span className="text-gray-900 font-bold text-base">Agentica</span>
          </div>

          {/* Center links */}
          <div className="hidden sm:flex items-center gap-6">
            {[
              { label:"Home",      href:"/"        },
              { label:"About",     href:"/about"   },
              { label:"Pricing",   href:"/pricing" },
              { label:"Contact",   href:"/contact" },
            ].map(({ label, href }) => (
              <button key={label} onClick={() => router.push(href)}
                className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors">{label}</button>
            ))}
          </div>

          {/* Right CTA */}
          <button onClick={() => router.push("/login")}
            className="px-4 py-1.5 rounded border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all">
            Login
          </button>
        </div>
      </nav>

      {/* Step progress bar */}
      {step !== "hero" && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-6 py-2.5 flex items-center justify-center gap-2">
            {(["company","discovery","signup"] as Step[]).map((s,i) => {
              const cur = ORDER.indexOf(step) - 1;
              const done = i < cur; const active = s === step;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background:active?"#2563eb":done?"#dbeafe":"#f3f4f6", color:active?"#fff":done?"#2563eb":"#9ca3af" }}>{i+1}</div>
                  <span className="text-[11px] font-semibold hidden sm:block" style={{ color:active?"#111827":"#9ca3af" }}>
                    {s==="company"?"Your business":s==="discovery"?"Competition":"Create account"}
                  </span>
                  {i<2 && <div className="w-6 h-px mx-1" style={{ background:done?"#bfdbfe":"#e5e7eb" }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Page content */}
      <div className={step === "hero" ? "w-full" : "flex items-start justify-center w-full px-6 py-12"}
        style={{ minHeight: step === "hero" ? "auto" : "calc(100vh - 100px)" }}>
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir} variants={SV}
            initial="enter" animate="center" exit="exit"
            transition={{ duration:0.3, ease:[0.4,0,0.2,1] }}
            className={step === "hero" ? "w-full" : "w-full flex justify-center"}>
            {step === "hero"      && <StepHero onStart={() => go("company")} />}
            {step === "company"   && <StepCompanyInput onNext={d => { setCompanyData(d); go("discovery"); }} />}
            {step === "discovery" && <StepDiscovery companyData={companyData} onNext={(r,s) => { setDiscovery(r); setSelected(s); go("signup"); }} />}
            {step === "signup" && discovery && (
              <StepSignupWall companyData={companyData} discoveryResult={discovery}
                selectedBrands={selected} onSignup={() => router.push("/login")} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      {step === "hero" && (
        <footer className="border-t border-gray-200 bg-white py-5 text-center">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} Agentica · Built for ambitious brands</p>
        </footer>
      )}
    </div>
  );
}
