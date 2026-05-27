"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowUpRight, BookmarkSimple, Heart, Envelope } from "@phosphor-icons/react";

const fade = (delay = 0) => ({
  initial:    { opacity: 0, y: 20 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
});

// ─── Official brand icons ─────────────────────────────────────────────────────

function GmailLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 48 48">
      <path fill="#4caf50" d="M45 16.2l-5 2.75-5 4.75L35 40h7c1.657 0 3-1.343 3-3V16.2z"/>
      <path fill="#1e88e5" d="M3 16.2l3.614 1.71L13 23.7V40H6c-1.657 0-3-1.343-3-3V16.2z"/>
      <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.45 35,23.7 36,17"/>
      <path fill="#c62828" d="M3 12.298V16.2l10 7.5V11.2L9.876 8.859C9.132 8.301 8.228 8 7.298 8 4.924 8 3 9.924 3 12.298z"/>
      <path fill="#fbc02d" d="M45 12.298V16.2l-10 7.5V11.2l3.124-2.341C38.868 8.301 39.772 8 40.702 8 43.076 8 45 9.924 45 12.298z"/>
    </svg>
  );
}

function XLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="#0f172a">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function LinkedInLogo() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24">
      <rect width="24" height="24" rx="4" fill="#0A66C2"/>
      <path fill="#fff" d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68z"/>
    </svg>
  );
}

const CHANNELS = [
  {
    Logo:  GmailLogo,
    label: "Email us 👋",
    sub:   "support@useagentica.com",
    href:  "mailto:support@useagentica.com",
    bg:    "#fff8f7",
    border:"#fde8e4",
  },
  {
    Logo:  XLogo,
    label: "Follow us",
    sub:   "@useagentica",
    href:  "https://x.com/useAgentica",
    bg:    "#f8fafc",
    border:"#e2e8f0",
  },
  {
    Logo:  LinkedInLogo,
    label: "LinkedIn",
    sub:   "useagentica",
    href:  "https://linkedin.com/company/useagentica",
    bg:    "#f0f7ff",
    border:"#dbeafe",
  },
];

export default function ContactPage() {
  const router = useRouter();

  const NAV = [
    { label:"Home",      href:"/"        },
    { label:"About",     href:"/about"   },
    { label:"Pricing",   href:"/pricing" },
    { label:"Contact",   href:"/contact" },
  ];

  return (
    <div className="min-h-screen" style={{ background:"#f5f6f8" }}>

      {/* ── Nav — same as every other page ── */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <button onClick={() => router.push("/")} className="flex items-center gap-2">
            <Image src="/logo-2.png" alt="Agentica" width={24} height={24} className="rounded-md" />
            <span className="text-gray-900 font-bold text-base">Agentica</span>
          </button>
          <div className="hidden sm:flex items-center gap-6">
            {NAV.map(({ label, href }) => (
              <button key={label} onClick={() => router.push(href)}
                className="text-xs font-medium transition-colors"
                style={{ color: label === "Contact" ? "#2563eb" : "#6b7280" }}>
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

      {/* ── Page body — card centred on the background ── */}
      <div className="flex items-center justify-center px-4 py-16">
        <motion.div {...fade(0)} className="w-full max-w-sm">

          {/* Card wrapper — mirrors reference exactly */}
          <div className="rounded-[28px] overflow-hidden"
            style={{ background:"#f0f2f5", boxShadow:"0 8px 40px rgba(0,0,0,0.10)" }}>

            {/* ── Top bar ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <button onClick={() => router.push("/")} className="flex items-center gap-1.5">
                <Image src="/logo-2.png" alt="Agentica" width={16} height={16} className="rounded" />
                <span className="text-[11px] font-bold text-gray-600">Agentica</span>
              </button>
              <button className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 transition-colors">
                <Heart size={11} /> Follow for more
              </button>
            </div>

            {/* ── Profile card ── */}
            <div className="bg-white mx-3 rounded-[20px] px-6 py-7 flex flex-col items-center text-center"
              style={{ boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
              <div className="w-[72px] h-[72px] rounded-full overflow-hidden mb-4"
                style={{ boxShadow:"0 4px 16px rgba(30,58,138,0.18)", border:"3px solid #fff" }}>
                <Image src="/logo-2.png" alt="Agentica" width={72} height={72}
                  className="object-cover w-full h-full" />
              </div>
              <h1 className="text-sm font-black text-gray-900 mb-1">Have a project?</h1>
              <p className="text-xs text-gray-500 leading-relaxed">
                Reach out — we&apos;re available for new conversations
              </p>
            </div>

            {/* ── Channels card ── */}
            <div className="bg-white mx-3 mt-2.5 mb-3 rounded-[20px] px-5 py-5"
              style={{ boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>

              {/* Three icons in a row */}
              <div className="grid grid-cols-3 gap-2">
                {CHANNELS.map(({ Logo, label, sub, href, bg, border }) => (
                  <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1.5 group">
                    <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105"
                      style={{ background: bg, border:`1px solid ${border}`, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                      <Logo />
                    </div>
                    <p className="text-[10px] font-black text-gray-800 text-center leading-tight">{label}</p>
                    <p className="text-[9px] text-gray-400 text-center leading-tight break-all">{sub}</p>
                  </a>
                ))}
              </div>

              {/* Divider */}
              <div className="my-4 h-px" style={{ background:"#f0f2f5" }} />

              {/* Direct email pill */}
              <a href="mailto:support@useagentica.com"
                className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-[14px] transition-all group hover:border-blue-200"
                style={{ background:"#f7f8fa", border:"1px solid #e8eaed" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                    style={{ background:"#eff6ff", border:"1px solid #dbeafe" }}>
                    <Envelope size={14} weight="duotone" style={{ color:"#1e3a8a" }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-800">Direct email</p>
                    <p className="text-[9px] text-gray-400">support@useagentica.com</p>
                  </div>
                </div>
                <ArrowUpRight size={13}
                  className="text-gray-300 group-hover:text-blue-500 transition-colors" />
              </a>
            </div>

            {/* ── Bottom bar ── */}
            <div className="flex items-center justify-between px-6 pb-5">
              <button className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 transition-colors">
                <Heart size={11} /> Follow for more
              </button>
              <button
                onClick={() => router.push("/pricing")}
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 transition-colors">
                Save <BookmarkSimple size={11} />
              </button>
            </div>

          </div>
        </motion.div>
      </div>

    </div>
  );
}
