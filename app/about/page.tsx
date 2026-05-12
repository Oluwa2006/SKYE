"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, ChartBar, FilmStrip, Lightbulb, Target, TrendUp, Users } from "@phosphor-icons/react";

const fade = (delay = 0) => ({
  initial:    { opacity: 0, y: 24 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
});

const TEAM = [
  { name:"Malkiel Godson",  role:"Founder & CEO",        bio:"Building the intelligence layer brands have always needed but never had."            },
  { name:"AI Research",     role:"Model & Prompt Design", bio:"Continuously refining how Gemini and GPT understand market signals and brand voice."  },
  { name:"Product",         role:"Design & Engineering",  bio:"Obsessed with making complex intelligence feel simple and fast for every user."       },
];

const VALUES = [
  { icon: Target,    title:"Precision over noise",    body:"We don't surface data — we surface answers. Every insight is distilled to what actually moves the needle."  },
  { icon: TrendUp,   title:"Speed is a feature",      body:"Competitive intelligence has a shelf life. We built every part of the pipeline to be fast by default."       },
  { icon: Lightbulb, title:"Intelligence, not reports", body:"The market doesn't need another dashboard. It needs a strategist that runs 24/7 and never misses a signal." },
  { icon: Users,     title:"Brands of every size",    body:"Whether you have one product or a hundred SKUs, Agentica adapts to your competitive landscape."              },
];

const TIMELINE = [
  { year:"2024", event:"Agentica founded", detail:"Started with a simple question: why does competitive research still take weeks?" },
  { year:"Q1 2025", event:"AI pipeline launched", detail:"Gemini + GPT working in tandem to analyse competitor content at scale." },
  { year:"Q2 2025", event:"Ad Studio ships", detail:"Brands can now go from reference video to rendered ad in under 10 minutes."  },
  { year:"Now", event:"Intelligence platform", detail:"The full loop: research → insight → creative → render. All in one place."  },
];

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen" style={{ background:"#f5f6f8" }}>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <button onClick={() => router.push("/")} className="flex items-center gap-2">
            <Image src="/logo-2.png" alt="Agentica" width={24} height={24} className="rounded-md" />
            <span className="text-gray-900 font-bold text-base">Agentica</span>
          </button>
          <div className="hidden sm:flex items-center gap-6">
            {[
              { label:"Home",      href:"/"        },
              { label:"About",     href:"/about"   },
              { label:"Pricing",   href:"/pricing" },
              { label:"Contact",   href:"/contact" },
            ].map(({ label, href }) => (
              <button key={label} onClick={() => router.push(href)}
                className="text-xs font-medium transition-colors"
                style={{ color: label === "About" ? "#2563eb" : "#6b7280" }}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => router.push("/login")}
            className="px-4 py-1.5 rounded border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all">
            Login
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6">

        {/* ── Hero ── */}
        <section className="py-20 text-center">
          <motion.div {...fade(0)}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
              style={{ background:"#eff6ff", color:"#2563eb", border:"1px solid #bfdbfe" }}>
              Our story
            </span>
            <h1 className="text-5xl sm:text-6xl font-black text-gray-900 leading-tight mb-6">
              Built for brands that<br />
              <span style={{ background:"linear-gradient(90deg,#1d4ed8,#7c3aed)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                refuse to guess.
              </span>
            </h1>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Agentica was built because competitive intelligence was broken — slow, expensive, and locked inside agency retainers. We put AI at the centre of it and made it instant.
            </p>
          </motion.div>
        </section>

        {/* ── Blue mission card ── */}
        <motion.section {...fade(0.15)} className="mb-20">
          <div className="relative rounded-[24px] overflow-hidden p-10 sm:p-14"
            style={{
              background:"linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#7c3aed 100%)",
              boxShadow:"0 20px 60px rgba(29,78,216,0.25)",
            }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.12) 1px,transparent 1px)", backgroundSize:"24px 24px" }} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] pointer-events-none"
              style={{ background:"radial-gradient(ellipse at top,rgba(255,255,255,0.18) 0%,transparent 70%)" }} />
            <div className="relative z-10 max-w-2xl">
              <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-4">Our mission</p>
              <h2 className="text-white text-3xl sm:text-4xl font-black leading-tight mb-5">
                Give every brand a<br />world-class strategist.
              </h2>
              <p className="text-blue-200 text-base leading-relaxed">
                The best brands in the world have rooms full of analysts tracking competitors, decoding trends, and building creative strategy. We built that room — and made it available to everyone, at the speed of AI.
              </p>
            </div>
          </div>
        </motion.section>

        {/* ── Values ── */}
        <motion.section {...fade(0.2)} className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-900 mb-3">What we believe</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">Four principles that shape every product decision we make.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {VALUES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white rounded-[18px] border border-gray-200 p-6 shadow-sm">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background:"#eff6ff", border:"1px solid #dbeafe" }}>
                  <Icon size={20} weight="duotone" style={{ color:"#2563eb" }} />
                </div>
                <h3 className="text-base font-black text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── What we built ── */}
        <motion.section {...fade(0.25)} className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-900 mb-3">The full intelligence loop</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">Six capabilities that work together — not in isolation.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { icon: ChartBar,  label:"Competitor Analysis",  desc:"Track every post, hook, and format across channels."       },
              { icon: Target,    label:"Hook Intelligence",     desc:"Decode exactly what stops the scroll in your niche."        },
              { icon: TrendUp,   label:"Trend Detection",       desc:"Catch rising content patterns before they peak."            },
              { icon: Lightbulb, label:"Creative Concepts",     desc:"AI-generated ideas built for your brand voice and goals."   },
              { icon: Users,     label:"Audience Mapping",      desc:"Understand who your competitors' audiences actually are."   },
              { icon: FilmStrip, label:"Ad Studio",             desc:"Go from reference video to rendered ad in minutes."         },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white rounded-[16px] border border-gray-200 p-5 shadow-sm">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                  style={{ background:"#eff6ff", border:"1px solid #dbeafe" }}>
                  <Icon size={18} weight="duotone" style={{ color:"#2563eb" }} />
                </div>
                <p className="text-sm font-black text-gray-900 mb-1">{label}</p>
                <p className="text-xs text-gray-500 leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Timeline ── */}
        <motion.section {...fade(0.3)} className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-900 mb-3">How we got here</h2>
          </div>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[72px] top-0 bottom-0 w-px" style={{ background:"#e5e7eb" }} />
            <div className="space-y-8">
              {TIMELINE.map(({ year, event, detail }) => (
                <div key={year} className="flex items-start gap-6">
                  <div className="w-[88px] shrink-0 text-right">
                    <span className="text-xs font-bold text-blue-600">{year}</span>
                  </div>
                  <div className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 ring-4 ring-white"
                    style={{ background:"#2563eb" }} />
                  <div className="bg-white rounded-[14px] border border-gray-200 p-4 shadow-sm flex-1">
                    <p className="text-sm font-black text-gray-900 mb-1">{event}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── Team ── */}
        <motion.section {...fade(0.35)} className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-900 mb-3">The people behind it</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">A small team with a very large ambition.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {TEAM.map(({ name, role, bio }) => (
              <div key={name} className="bg-white rounded-[18px] border border-gray-200 p-6 shadow-sm text-center">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background:"linear-gradient(135deg,#1d4ed8,#7c3aed)" }}>
                  <span className="text-white text-lg font-black">{name[0]}</span>
                </div>
                <p className="text-sm font-black text-gray-900 mb-0.5">{name}</p>
                <p className="text-[11px] font-semibold text-blue-600 mb-3">{role}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{bio}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── CTA ── */}
        <motion.section {...fade(0.4)} className="mb-20">
          <div className="rounded-[24px] border border-gray-200 bg-white shadow-sm p-10 sm:p-14 text-center">
            <h2 className="text-3xl font-black text-gray-900 mb-4">Ready to see your market clearly?</h2>
            <p className="text-gray-500 text-base max-w-md mx-auto mb-8 leading-relaxed">
              Start your competitive analysis today — no account required to see what we find.
            </p>
            <button onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold transition-all hover:opacity-90"
              style={{ background:"linear-gradient(135deg,#1d4ed8,#7c3aed)", color:"#fff", boxShadow:"0 8px 24px rgba(29,78,216,0.3)" }}>
              Start Analysis <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        </motion.section>

      </main>

      <footer className="border-t border-gray-100 bg-white py-6 text-center">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} Agentica · Built for ambitious brands</p>
      </footer>
    </div>
  );
}
