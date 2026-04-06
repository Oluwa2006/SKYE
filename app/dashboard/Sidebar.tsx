"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  SquaresFour, Lightbulb, Users, ChartBar, Globe,
  Video, GearSix, PencilLine, UserPlus, SignOut, FilmSlate, Megaphone,
  MagnifyingGlass, CaretRight,
} from "@phosphor-icons/react";
import { useUser } from "./UserContext";
import { createSupabaseBrowser } from "@/lib/supabase-client";

const INTELLIGENCE_SUBNAV = [
  { section: "overview",    label: "Overview" },
  { section: "my-content",  label: "My Content" },
  { section: "competitors", label: "Competitors" },
  { section: "audience",    label: "Audience" },
  { section: "actions",     label: "Actions" },
  { section: "learning",    label: "Learning Log" },
];

const navGroups = [
  {
    label: "Core",
    items: [
      { href: "/dashboard",        label: "Home",          icon: SquaresFour },
      { href: "/dashboard/ideas",  label: "Ideas",         icon: Lightbulb },
      { href: "/dashboard/social", label: "Social",        icon: Users },
    ],
  },
  {
    label: "Intel",
    items: [
      { href: "/dashboard/sources",   label: "Sources",       icon: Globe },
      { href: "/dashboard/analysis",  label: "Intelligence",  icon: ChartBar },
      { href: "/dashboard/ugc",       label: "UGC Creators",  icon: Video },
      { href: "/dashboard/video",     label: "Video Studio",  icon: FilmSlate },
      { href: "/dashboard/ads",       label: "Ad Studio",     icon: Megaphone },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/dashboard/brand-prompt", label: "Brand Prompt", icon: PencilLine },
      { href: "/dashboard/settings",     label: "Settings",     icon: GearSix },
      { href: "/dashboard/team",         label: "Team",         icon: UserPlus },
    ],
  },
];

// Cloud SVG for decoration
function Cloud({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <path
        d="M96 44H28C17.5 44 9 35.5 9 25C9 14.5 17.5 6 28 6C29.8 6 31.6 6.3 33.2 6.8C36.7 2.6 42 0 48 0C58.5 0 67 8.5 67 19C67 19.3 67 19.6 67 19.9C69.3 18.7 71.9 18 74.7 18C83.9 18 91.4 25.5 91.4 34.7C91.4 35.2 91.4 35.7 91.3 36.2C93.9 37.3 96 40 96 43V44Z"
        fill="rgba(255,255,255,0.12)"
      />
    </svg>
  );
}

function UserAvatar({ name, size = 30 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0 text-[10px] font-bold"
      style={{
        background: "rgba(255,255,255,0.18)",
        color: "#ffffff",
        border: "1px solid rgba(255,255,255,0.22)",
        width: size,
        height: size,
      }}
    >
      {initials}
    </div>
  );
}

export default function Sidebar() {
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const router      = useRouter();
  const user        = useUser();
  const supabase    = createSupabaseBrowser();

  const [intelligenceOpen, setIntelligenceOpen] = useState(pathname.startsWith("/dashboard/analysis"));
  const [searchFocused, setSearchFocused]       = useState(false);
  const activeSection = searchParams.get("section") ?? "overview";

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="fixed inset-y-0 left-0 z-20 flex flex-col overflow-hidden"
      style={{
        width: "220px",
        height: "100vh",
        background: "linear-gradient(160deg, #1d4ed8 0%, #1e40af 60%, #1e3a8a 100%)",
        borderRight: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {/* ── Cloud decorations ──────────────────────────────────────────────── */}
      <Cloud style={{ position: "absolute", top: -10, right: -20, width: 160, opacity: 0.6, pointerEvents: "none" }} />
      <Cloud style={{ position: "absolute", top: 120, left: -30, width: 140, opacity: 0.35, pointerEvents: "none", transform: "scaleX(-1)" }} />
      <Cloud style={{ position: "absolute", bottom: 180, right: -20, width: 130, opacity: 0.25, pointerEvents: "none" }} />
      <Cloud style={{ position: "absolute", bottom: 60, left: -10, width: 110, opacity: 0.18, pointerEvents: "none" }} />

      {/* ── Logo ───────────────────────────────────────────────────────────── */}
      <div className="relative px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-2xl"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.22)" }}
          >
            <Image src="/logo.png" alt="Agentica" width={22} height={22} className="w-5.5 h-5.5 object-contain" />
          </div>
          <div>
            <p className="text-base leading-none text-white" style={{ fontFamily: "var(--font-josefin)", letterSpacing: "0.08em" }}>
              AGENTICA
            </p>
            <p className="text-[10px] mt-1 uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.55)" }}>
              Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="relative px-4 pb-4">
        <div
          className="flex items-center gap-2 rounded-2xl border px-3 py-2.5"
          style={{
            background: searchFocused ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.08)",
            borderColor: searchFocused ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.14)",
          }}
        >
          <MagnifyingGlass size={14} weight="regular" style={{ color: "rgba(255,255,255,0.5)" }} />
          <input
            type="text"
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-xs outline-none text-white placeholder:text-white/40"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <span
            className="rounded-md border px-1.5 py-0.5 text-[10px]"
            style={{ color: "rgba(255,255,255,0.38)", borderColor: "rgba(255,255,255,0.16)" }}
          >
            ⌘K
          </span>
        </div>
      </div>

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className="relative flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p
                className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "rgba(255,255,255,0.42)" }}
              >
                {group.label}
              </p>

              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active        = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
                  const isIntelligence = href === "/dashboard/analysis";

                  if (isIntelligence) {
                    return (
                      <div key={href}>
                        <Link
                          href={href}
                          onClick={() => setIntelligenceOpen((v) => !v)}
                          className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-xs font-medium transition-all"
                          style={{
                            background:  active ? "rgba(255,255,255,0.16)" : "transparent",
                            color:       active ? "#ffffff" : "rgba(255,255,255,0.78)",
                            boxShadow:   active ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                          }}
                          onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
                          onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <Icon size={15} weight="regular" className="shrink-0" />
                          <span className="flex-1">{label}</span>
                          <CaretRight
                            size={13}
                            weight="regular"
                            style={{
                              color: "rgba(255,255,255,0.42)",
                              transform: intelligenceOpen ? "rotate(90deg)" : "rotate(0deg)",
                              transition: "transform 180ms ease",
                            }}
                          />
                        </Link>

                        <div style={{ maxHeight: intelligenceOpen ? `${INTELLIGENCE_SUBNAV.length * 34}px` : "0px", overflow: "hidden", transition: "max-height 220ms ease" }}>
                          <div className="ml-4 mt-1 border-l pl-3" style={{ borderColor: "rgba(255,255,255,0.16)" }}>
                            {INTELLIGENCE_SUBNAV.map(({ section, label: subLabel }) => {
                              const subActive = pathname.startsWith("/dashboard/analysis") && activeSection === section;
                              return (
                                <Link
                                  key={section}
                                  href={`/dashboard/analysis?section=${section}`}
                                  className="flex items-center gap-2 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors"
                                  style={{
                                    color:      subActive ? "#ffffff" : "rgba(255,255,255,0.65)",
                                    background: subActive ? "rgba(255,255,255,0.1)" : "transparent",
                                  }}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: subActive ? "#ffffff" : "rgba(255,255,255,0.28)" }} />
                                  {subLabel}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-xs font-medium transition-all"
                      style={{
                        background: active ? "rgba(255,255,255,0.16)" : "transparent",
                        color:      active ? "#ffffff" : "rgba(255,255,255,0.78)",
                        boxShadow:  active ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                      }}
                      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
                      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <Icon size={15} weight="regular" className="shrink-0" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* ── User footer ────────────────────────────────────────────────────── */}
      <div className="relative px-4 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
        <div className="rounded-[22px] border px-3 py-3" style={{ borderColor: "rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.08)" }}>
          {user ? (
            <div className="flex items-center gap-2.5">
              <UserAvatar name={user.display_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{user.display_name}</p>
                <p className="truncate text-[10px]" style={{ color: "rgba(255,255,255,0.48)" }}>
                  {user.email}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="rounded-lg p-2 transition-colors"
                style={{ color: "rgba(255,255,255,0.45)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.color = "#ffffff"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"; }}
              >
                <SignOut size={13} weight="regular" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white opacity-60" />
              <p className="text-[11px] text-white/60">Connected</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
