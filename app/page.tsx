"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BarChart2, Film, Sparkles, Users } from "lucide-react";

// ─── Floating cards data ──────────────────────────────────────────────────
const CARDS = [
  { Icon: BarChart2, label: "Analytics",    sub: "Competitor scores",  rotate: "-7deg", y: "0px",   delay: "0ms"   },
  { Icon: Film,      label: "Video Studio", sub: "Kling · Pika",       rotate: "-2deg", y: "-18px", delay: "120ms" },
  { Icon: Sparkles,  label: "Intelligence", sub: "Behavior insights",  rotate: "3deg",  y: "-12px", delay: "240ms" },
  { Icon: Users,     label: "UGC Creators", sub: "Find & track talent", rotate: "8deg", y: "6px",   delay: "360ms" },
];

// ─── Realistic Cloud component ───────────────────────────────────────────
// Built from layered blurred circles — mimics real cumulus depth
interface CloudProps {
  style?: React.CSSProperties;
  scale?: number;   // 1 = default size
  opacity?: number; // 0–1
}

function Cloud({ style, scale = 1, opacity = 1 }: CloudProps) {
  const s = scale;
  // Each puff: { w, h, left, top, blur, o }
  const puffs = [
    // Base layer — wide, flat, very soft
    { w: 340*s, h: 80*s,  l: 0,      t: 100*s, blur: 28*s, o: 0.55 },
    { w: 280*s, h: 70*s,  l: 40*s,   t: 105*s, blur: 22*s, o: 0.45 },
    // Mid layer — main cloud body
    { w: 160*s, h: 130*s, l: 20*s,   t: 40*s,  blur: 20*s, o: 0.80 },
    { w: 200*s, h: 150*s, l: 80*s,   t: 20*s,  blur: 18*s, o: 0.85 },
    { w: 180*s, h: 140*s, l: 160*s,  t: 30*s,  blur: 18*s, o: 0.80 },
    { w: 140*s, h: 120*s, l: 230*s,  t: 45*s,  blur: 18*s, o: 0.75 },
    // Top highlights — bright, tighter blur
    { w: 120*s, h: 100*s, l: 100*s,  t: 5*s,   blur: 12*s, o: 0.90 },
    { w: 100*s, h: 90*s,  l: 170*s,  t: 10*s,  blur: 12*s, o: 0.85 },
    { w: 80*s,  h: 80*s,  l: 60*s,   t: 15*s,  blur: 10*s, o: 0.80 },
    // Shadow underbelly — slightly grey, subtle
    { w: 260*s, h: 40*s,  l: 30*s,   t: 128*s, blur: 20*s, o: 0.18, grey: true },
  ];

  const W = 380 * s;
  const H = 180 * s;

  return (
    <div
      className="absolute pointer-events-none"
      style={{ width: W, height: H, opacity, ...style }}
    >
      {puffs.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width:  p.w,
            height: p.h,
            left:   p.l,
            top:    p.t,
            background: p.grey
              ? `rgba(180,200,220,${p.o})`
              : `rgba(255,255,255,${p.o})`,
            filter: `blur(${p.blur}px)`,
          }}
        />
      ))}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Small delay so the enter animation plays
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-hidden flex flex-col"
      style={{
        background: "linear-gradient(175deg, #7ec8f0 0%, #b8dff5 30%, #d6ecf8 55%, #eaf5fb 75%, #f5fafd 100%)",
      }}
    >

      {/* ── Animated clouds ─────────────────────────────────────────── */}
      <Cloud scale={1.1}  opacity={0.8} style={{ top: "55%", left:  "-80px", animation: "cloudDrift 28s linear  0s infinite"          }} />
      <Cloud scale={0.84} opacity={0.6} style={{ top: "62%", right: "-60px", animation: "cloudDrift 36s linear -12s infinite reverse"  }} />
      <Cloud scale={0.68} opacity={0.5} style={{ top: "72%", left:  "20%",   animation: "cloudDrift 44s linear -20s infinite"          }} />
      <Cloud scale={1.0}  opacity={0.4} style={{ top: "78%", right: "15%",   animation: "cloudDrift 32s linear  -5s infinite reverse"  }} />
      <Cloud scale={0.53} opacity={0.3} style={{ top: "50%", left:  "45%",   animation: "cloudDrift 50s linear -30s infinite"          }} />

      {/* ── Keyframe styles ─────────────────────────────────────────── */}
      <style>{`
        @keyframes cloudDrift {
          0%   { transform: translateX(0px);    }
          50%  { transform: translateX(60px);   }
          100% { transform: translateX(0px);    }
        }
        @keyframes floatUp {
          0%   { transform: translateY(0px) rotate(var(--r)); }
          50%  { transform: translateY(-14px) rotate(var(--r)); }
          100% { transform: translateY(0px) rotate(var(--r)); }
        }
        @keyframes riseIn {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0px);  }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      {/* ── Nav bar ─────────────────────────────────────────────────── */}
      <nav
        className="relative z-20 flex items-center justify-between px-8 py-5"
        style={{
          opacity: mounted ? 1 : 0,
          transition: "opacity 600ms ease",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="SKYE" width={30} height={30} className="rounded-xl shadow-sm" />
          <span
            className="text-white font-bold text-lg tracking-tight"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.15)" }}
          >
            SKYE
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push("/login")}
          className="px-5 py-2 rounded-full bg-white/90 backdrop-blur text-gray-800 text-sm font-semibold shadow-sm hover:bg-white transition-all hover:shadow-md"
        >
          Get Started
        </button>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-12 px-6">

        {/* Headline */}
        <div className="text-center mb-3">
          <h1
            className="text-5xl sm:text-6xl font-bold text-white leading-tight"
            style={{
              textShadow: "0 2px 20px rgba(0,80,140,0.25)",
              animation: mounted ? "riseIn 900ms cubic-bezier(0.22,1,0.36,1) 100ms both" : "none",
              opacity: 0,
            }}
          >
            Your Brand&apos;s{" "}
            <em
              className="not-italic"
              style={{
                fontFamily: "var(--font-nunito), 'Nunito', Georgia, serif",
                fontWeight: 300,
              }}
            >
              Unfair
            </em>{" "}
            Advantage
          </h1>
        </div>

        {/* Sub */}
        <p
          className="text-white/80 text-base sm:text-lg text-center max-w-md mt-2"
          style={{
            textShadow: "0 1px 8px rgba(0,60,120,0.15)",
            animation: mounted ? "fadeSlideUp 800ms ease 350ms both" : "none",
            opacity: 0,
          }}
        >
          Scrape competitors, decode what goes viral, and generate content that converts — all in one workspace.
        </p>

        {/* CTA buttons */}
        <div
          className="flex items-center gap-3 mt-8"
          style={{
            animation: mounted ? "fadeSlideUp 800ms ease 500ms both" : "none",
            opacity: 0,
          }}
        >
          <button
            onClick={() => router.push("/login")}
            className="px-7 py-3 rounded-full bg-gray-900/90 backdrop-blur text-white text-sm font-semibold shadow-lg hover:bg-gray-900 transition-all hover:shadow-xl hover:scale-[1.03]"
          >
            Join Beta
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-7 py-3 rounded-full bg-white/80 backdrop-blur text-gray-700 text-sm font-semibold shadow hover:bg-white transition-all hover:shadow-md"
          >
            Go to Dashboard →
          </button>
        </div>

        {/* ── Floating feature cards ───────────────────────────────── */}
        <div
          className="flex items-end gap-5 mt-12"
          style={{
            animation: mounted ? "fadeSlideUp 900ms ease 600ms both" : "none",
            opacity: 0,
          }}
        >
          {CARDS.map((card, i) => {
            const { Icon } = card;
            return (
              <div
                key={i}
                style={{
                  transform: `translateY(${card.y}) rotate(${card.rotate})`,
                  ["--r" as string]: card.rotate,
                  animation: `floatUp ${5 + i * 0.6}s ease-in-out ${card.delay} infinite`,
                }}
              >
                <div
                  className="w-28 rounded-2xl overflow-hidden shadow-xl border border-white/50"
                  style={{
                    background: "rgba(255,255,255,0.80)",
                    backdropFilter: "blur(14px)",
                  }}
                >
                  {/* Icon area */}
                  <div
                    className="w-full h-16 flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.60)" }}
                  >
                    <Icon size={28} strokeWidth={1.5} color="#4a9fd4" />
                  </div>
                  {/* Label */}
                  <div className="px-2.5 py-2 border-t border-gray-100/60">
                    <p className="text-[11px] font-bold text-gray-700 truncate">{card.label}</p>
                    <p className="text-[9px] text-gray-400 truncate">{card.sub}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Central "dashboard" object (replaces cart) ──────────── */}
        <div
          className="relative mt-2 z-0"
          style={{
            animation: mounted ? "fadeSlideUp 1000ms ease 700ms both" : "none",
            opacity: 0,
          }}
        >
          {/* Mock dashboard screen */}
          <div
            className="w-72 sm:w-96 rounded-3xl overflow-hidden shadow-2xl border border-white/50"
            style={{
              background: "rgba(255,255,255,0.75)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Titlebar */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-gray-100/80">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
              <div className="flex-1 mx-3 h-4 rounded-full bg-gray-100/80 flex items-center justify-center">
                <span className="text-[8px] text-gray-400">skye.app/dashboard</span>
              </div>
            </div>

            {/* Fake dashboard content */}
            <div className="p-4 space-y-3">
              {/* Stat row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Posts", value: "1.2K" },
                  { label: "Analyses", value: "847" },
                  { label: "Ideas",    value: "94"  },
                ].map(s => (
                  <div key={s.label} className="bg-white/80 rounded-xl p-2 text-center shadow-sm border border-gray-100/60">
                    <p className="text-sm font-bold text-gray-800">{s.value}</p>
                    <p className="text-[9px] text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Bar chart mockup */}
              <div className="bg-white/80 rounded-xl p-3 border border-gray-100/60">
                <p className="text-[9px] font-semibold text-gray-400 mb-2">Content Analytics</p>
                <div className="flex items-end gap-1.5 h-10">
                  {[40, 65, 50, 80, 55, 75, 45, 90].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t" style={{
                      height: `${h}%`,
                      background: i === 7 ? "#7c3aed" : "#7c3aed44",
                    }} />
                  ))}
                </div>
              </div>

              {/* Row items */}
              {[
                { name: "@foodie.hyd",  val: "8.4/10", color: "#10b981" },
                { name: "@biryani.co",  val: "7.1/10", color: "#f59e0b" },
                { name: "@streetbites", val: "9.0/10", color: "#10b981" },
              ].map(r => (
                <div key={r.name} className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-1.5 border border-gray-100/60">
                  <p className="text-[10px] font-semibold text-gray-700">{r.name}</p>
                  <span className="text-[10px] font-bold" style={{ color: r.color }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Footer strip ────────────────────────────────────────────── */}
      <div
        className="relative z-20 text-center pb-6 pt-4"
        style={{
          animation: mounted ? "fadeSlideUp 800ms ease 900ms both" : "none",
          opacity: 0,
        }}
      >
        <p className="text-white/40 text-[11px]">
          Built for food brands · Powered by AI · © {new Date().getFullYear()} SKYE
        </p>
      </div>

    </div>
  );
}
