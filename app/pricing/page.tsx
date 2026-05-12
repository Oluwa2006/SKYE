"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Lightning, Sparkle, Users, FilmStrip, ChartBar, Target } from "@phosphor-icons/react";

const fade = (delay = 0) => ({
  initial:    { opacity: 0, y: 24 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
});

const PLANS = [
  {
    name:        "Starter",
    price:       { monthly: 29, annual: 23 },
    description: "For solo founders testing the waters.",
    accent:      "#6b7280",
    accentLight: "#f9fafb",
    accentBorder:"#e5e7eb",
    features: [
      "1 brand profile",
      "5 competitors tracked",
      "Ideas & hook generation",
      "Intelligence overview dashboard",
      "3 ad renders / month",
      "Admin-created templates only",
      "1 seat",
    ],
    cta: "Start free trial",
    popular: false,
  },
  {
    name:        "Growth",
    price:       { monthly: 79, annual: 63 },
    description: "The full loop. Most teams start here.",
    accent:      "#2563eb",
    accentLight: "#eff6ff",
    accentBorder:"#bfdbfe",
    features: [
      "3 brand profiles",
      "Full intelligence dashboard",
      "Competitor analysis pipeline",
      "15 ad renders / month",
      "AI copy adaptation (brand voice swap)",
      "3D product angle generator",
      "2 seats",
    ],
    cta: "Start free trial",
    popular: true,
  },
  {
    name:        "Pro",
    price:       { monthly: 149, annual: 119 },
    description: "Unlimited renders. Built for power users.",
    accent:      "#7c3aed",
    accentLight: "#f5f3ff",
    accentBorder:"#ddd6fe",
    features: [
      "Unlimited brand profiles",
      "Unlimited ad renders",
      "Reference video upload + AI analysis",
      "Priority Lambda rendering queue",
      "UGC creator tracking",
      "5 seats",
    ],
    cta: "Start free trial",
    popular: false,
  },
  {
    name:        "Agency",
    price:       { monthly: 299, annual: 239 },
    description: "Multiple clients. One platform.",
    accent:      "#0f172a",
    accentLight: "#f8fafc",
    accentBorder:"#e2e8f0",
    features: [
      "Everything in Pro",
      "Multiple client workspaces",
      "Team management & permissions",
      "Bulk renders",
      "Unlimited seats",
      "Dedicated support",
    ],
    cta: "Talk to us",
    popular: false,
  },
];

const FEATURE_COMPARE = [
  { label: "Brand profiles",              starter:"1",          growth:"3",         pro:"Unlimited",  agency:"Unlimited" },
  { label: "Competitors tracked",         starter:"5",          growth:"Unlimited",  pro:"Unlimited",  agency:"Unlimited" },
  { label: "Ad renders / month",          starter:"3",          growth:"15",         pro:"Unlimited",  agency:"Unlimited" },
  { label: "Intelligence dashboard",      starter:"Overview",   growth:"Full",       pro:"Full",       agency:"Full" },
  { label: "AI copy adaptation",          starter:false,        growth:true,         pro:true,         agency:true },
  { label: "3D product angles",           starter:false,        growth:true,         pro:true,         agency:true },
  { label: "Reference video analysis",   starter:false,        growth:false,        pro:true,         agency:true },
  { label: "Priority render queue",       starter:false,        growth:false,        pro:true,         agency:true },
  { label: "UGC creator tracking",        starter:false,        growth:false,        pro:true,         agency:true },
  { label: "Client workspaces",           starter:false,        growth:false,        pro:false,        agency:true },
  { label: "Seats",                        starter:"1",          growth:"2",          pro:"5",          agency:"Unlimited" },
];

const FAQS = [
  {
    q: "What counts as an ad render?",
    a: "Every time you hit Render inside Ad Studio and a video is produced via AWS Lambda, that counts as one render. Previews (first 3 seconds) don't count toward your limit.",
  },
  {
    q: "Can I upgrade or downgrade anytime?",
    a: "Yes. Plan changes take effect immediately. If you upgrade mid-cycle you're charged the prorated difference. If you downgrade, the credit carries into your next billing period.",
  },
  {
    q: "What happens when I hit my render limit?",
    a: "You'll see a prompt to upgrade before any render is blocked. We never silently fail a render job.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — 7 days on Growth, no credit card required. You get the full feature set so you can see the intelligence loop end-to-end before committing.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Yes. Annual plans are billed upfront and save you ~20% versus paying month-to-month.",
  },
  {
    q: "What AI models power Agentica?",
    a: "Gemini handles video and visual analysis. GPT-4o handles competitor research, copy, and strategic reasoning. They run in tandem — you don't need to choose.",
  },
];

function Tick({ val }: { val: boolean | string }) {
  if (val === false) return <span className="text-gray-300 text-base">—</span>;
  if (val === true)  return <Check size={16} weight="bold" style={{ color:"#2563eb" }} />;
  return <span className="text-xs font-semibold text-gray-700">{val}</span>;
}

export default function PricingPage() {
  const router   = useRouter();
  const [annual, setAnnual]       = useState(false);
  const [openFaq, setOpenFaq]     = useState<number | null>(null);
  const [growthHover, setGrowthHover] = useState(false);

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
                style={{ color: label === "Pricing" ? "#2563eb" : "#6b7280" }}>
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

        {/* Hero */}
        <section className="py-16 text-center">
          <motion.div {...fade(0)}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5"
              style={{ background:"#eff6ff", color:"#2563eb", border:"1px solid #bfdbfe" }}>
              <Sparkle size={12} weight="fill" /> Simple, transparent pricing
            </span>
            <h1 className="text-5xl sm:text-6xl font-black text-gray-900 leading-tight mb-4">
              Pay for what you<br />
              <span style={{ background:"linear-gradient(90deg,#1d4ed8,#7c3aed)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                actually use.
              </span>
            </h1>
            <p className="text-base text-gray-500 max-w-lg mx-auto leading-relaxed mb-8">
              Every plan includes a 7-day free trial. No credit card required to start.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-full px-2 py-1.5 shadow-sm">
              <button
                onClick={() => setAnnual(false)}
                className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{ background: !annual ? "#2563eb" : "transparent", color: !annual ? "#fff" : "#6b7280" }}>
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{ background: annual ? "#2563eb" : "transparent", color: annual ? "#fff" : "#6b7280" }}>
                Annual
                <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: annual ? "rgba(255,255,255,0.25)" : "#dcfce7", color: annual ? "#fff" : "#15803d" }}>
                  save 20%
                </span>
              </button>
            </div>
          </motion.div>
        </section>

        {/* Pricing cards */}
        <motion.section {...fade(0.1)} className="mb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {PLANS.map((plan) => {
              const isGrowth = plan.popular;
              const g = isGrowth ? growthHover : false;

              return (
                <div
                  key={plan.name}
                  onMouseEnter={() => isGrowth && setGrowthHover(true)}
                  onMouseLeave={() => isGrowth && setGrowthHover(false)}
                  className="relative rounded-[22px] border flex flex-col"
                  style={{
                    background:  isGrowth ? (g ? "#1e3a8a" : "#fff") : "#fff",
                    borderColor: isGrowth ? "#1e3a8a" : plan.accentBorder,
                    borderWidth:  isGrowth ? 2 : 1,
                    boxShadow:   isGrowth
                      ? g
                        ? "0 24px 64px rgba(30,58,138,0.35)"
                        : "0 8px 32px rgba(30,58,138,0.18)"
                      : "0 2px 8px rgba(0,0,0,0.04)",
                    transform:   isGrowth ? "scale(1.06) translateY(-6px)" : "none",
                    zIndex:      isGrowth ? 10 : 0,
                    transition:  "background 220ms ease, box-shadow 220ms ease",
                  }}>

                  {isGrowth && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold text-white"
                        style={{ background:"#1e3a8a", boxShadow:"0 4px 12px rgba(30,58,138,0.45)" }}>
                        Most popular
                      </span>
                    </div>
                  )}

                  <div className="p-6 flex-1 flex flex-col">
                    {/* Plan header */}
                    <div className="mb-4">
                      <p className="text-sm font-black mb-0.5"
                        style={{ color: isGrowth ? (g ? "#fff" : "#1e3a8a") : "#111827" }}>
                        {plan.name}
                      </p>
                      <p className="text-[11px] leading-snug"
                        style={{ color: isGrowth ? (g ? "rgba(255,255,255,0.6)" : "#6b7280") : "#9ca3af" }}>
                        {plan.description}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="mb-5">
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-black"
                          style={{ color: isGrowth ? (g ? "#fff" : "#1e3a8a") : "#111827" }}>
                          ${annual ? plan.price.annual : plan.price.monthly}
                        </span>
                        <span className="text-xs mb-1.5"
                          style={{ color: isGrowth ? (g ? "rgba(255,255,255,0.5)" : "#9ca3af") : "#9ca3af" }}>/mo</span>
                      </div>
                      {annual && (
                        <p className="text-[10px] mt-0.5"
                          style={{ color: isGrowth ? (g ? "rgba(255,255,255,0.45)" : "#9ca3af") : "#9ca3af" }}>
                          billed ${plan.price.annual * 12}/yr
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-2.5 flex-1 mb-6">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                            style={{
                              background: isGrowth
                                ? g ? "rgba(255,255,255,0.18)" : "#eff6ff"
                                : plan.accentLight,
                              border: isGrowth
                                ? g ? "1px solid rgba(255,255,255,0.28)" : "1px solid #bfdbfe"
                                : `1px solid ${plan.accentBorder}`,
                            }}>
                            <Check size={9} weight="bold"
                              style={{ color: isGrowth ? (g ? "#fff" : "#1e3a8a") : plan.accent }} />
                          </div>
                          <span className="text-[11px] leading-snug"
                            style={{ color: isGrowth ? (g ? "rgba(255,255,255,0.82)" : "#374151") : "#374151" }}>
                            {f}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <button
                      onClick={() => router.push("/login")}
                      className="w-full py-2.5 rounded-[14px] text-xs font-bold flex items-center justify-center gap-1.5"
                      style={{
                        background:  isGrowth ? (g ? "#fff" : "#1e3a8a") : plan.accent,
                        color:       isGrowth ? (g ? "#1e3a8a" : "#fff") : "#fff",
                        transition:  "background 220ms ease, color 220ms ease",
                      }}>
                      {plan.cta} <ArrowRight size={12} weight="bold" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* What's actually included — feature gate explainer */}
        <motion.section {...fade(0.15)} className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-900 mb-3">What each plan includes</h2>
            <p className="text-sm text-gray-500">Every feature, clearly stated.</p>
          </div>

          <div className="bg-white rounded-[22px] border border-gray-200 overflow-hidden shadow-sm">
            {/* Header row */}
            <div className="grid grid-cols-5 px-5 py-3 border-b border-gray-100 bg-gray-50">
              <div className="col-span-1" />
              {["Starter","Growth","Pro","Agency"].map((p) => (
                <div key={p} className="col-span-1 text-center">
                  <span className="text-[11px] font-black text-gray-700">{p}</span>
                </div>
              ))}
            </div>

            {/* Rows */}
            {FEATURE_COMPARE.map((row, i) => (
              <div key={row.label}
                className="grid grid-cols-5 px-5 py-3 items-center"
                style={{ borderTop: i > 0 ? "1px solid #f3f4f6" : undefined }}>
                <div className="col-span-1">
                  <span className="text-xs text-gray-600">{row.label}</span>
                </div>
                {(["starter","growth","pro","agency"] as const).map((tier) => (
                  <div key={tier} className="col-span-1 flex justify-center">
                    <Tick val={row[tier]} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </motion.section>

        {/* Cost explainer */}
        <motion.section {...fade(0.2)} className="mb-20">
          <div className="relative rounded-[24px] overflow-hidden p-8 sm:p-12"
            style={{
              background:"linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#7c3aed 100%)",
              boxShadow:"0 20px 60px rgba(29,78,216,0.22)",
            }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.1) 1px,transparent 1px)", backgroundSize:"24px 24px" }} />
            <div className="relative z-10">
              <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-3">Why these prices</p>
              <h2 className="text-white text-2xl sm:text-3xl font-black mb-5 leading-tight max-w-xl">
                Every render runs on AWS Lambda. Every analysis hits Gemini and GPT-4o.
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: FilmStrip, label:"Per ad render",     cost:"~$0.50–2.00",  note:"AWS Lambda + encoding" },
                  { icon: ChartBar,  label:"Per video analysis",cost:"~$1.00–3.00",  note:"Gemini multi-modal" },
                  { icon: Target,    label:"Per competitor run", cost:"~$0.15–0.40",  note:"GPT-4o research" },
                  { icon: Lightning, label:"Per 3D model",       cost:"~$0.50–1.00",  note:"Fal.ai Trellis" },
                ].map(({ icon: Icon, label, cost, note }) => (
                  <div key={label} className="rounded-[16px] p-4"
                    style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)" }}>
                    <Icon size={18} weight="duotone" style={{ color:"rgba(255,255,255,0.7)", marginBottom:8 }} />
                    <p className="text-white text-sm font-black">{cost}</p>
                    <p className="text-blue-200 text-[10px] mt-0.5 font-semibold">{label}</p>
                    <p className="text-blue-300 text-[10px] mt-0.5">{note}</p>
                  </div>
                ))}
              </div>
              <p className="text-blue-200 text-xs mt-5 max-w-lg leading-relaxed">
                Pricing is designed to cover real infrastructure costs while giving you a predictable monthly bill — not a surprise invoice every time you hit render.
              </p>
            </div>
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section {...fade(0.25)} className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-gray-900 mb-3">Common questions</h2>
          </div>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white rounded-[16px] border border-gray-200 overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left">
                  <span className="text-sm font-bold text-gray-900">{faq.q}</span>
                  <span className="text-gray-400 text-lg shrink-0 ml-4"
                    style={{ transform: openFaq === i ? "rotate(45deg)" : "none", transition:"transform 180ms ease" }}>
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section {...fade(0.3)} className="mb-20">
          <div className="rounded-[24px] border border-gray-200 bg-white shadow-sm p-10 sm:p-14 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background:"#eff6ff", border:"1px solid #dbeafe" }}>
              <Users size={22} weight="duotone" style={{ color:"#2563eb" }} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-3">Start your 7-day free trial</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-8 leading-relaxed">
              No credit card. No commitment. Full Growth plan access for a week — see the intelligence loop end-to-end before you decide.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button onClick={() => router.push("/login")}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold transition-all hover:opacity-90"
                style={{ background:"linear-gradient(135deg,#1d4ed8,#7c3aed)", color:"#fff", boxShadow:"0 8px 24px rgba(29,78,216,0.3)" }}>
                Get started free <ArrowRight size={16} weight="bold" />
              </button>
              <button onClick={() => router.push("/about")}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all">
                Learn about us
              </button>
            </div>
          </div>
        </motion.section>

      </main>

      <footer className="border-t border-gray-100 bg-white py-6 text-center">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} Agentica · Built for ambitious brands</p>
      </footer>
    </div>
  );
}
