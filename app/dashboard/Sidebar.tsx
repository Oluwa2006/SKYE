"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  SquaresFour, Lightbulb, Users, ChartBar, Globe,
  Video, GearSix, PencilLine, UserPlus, SignOut, Megaphone,
  MagnifyingGlass, CaretRight,
} from "@phosphor-icons/react";
import { useUser } from "./UserContext";
import { createSupabaseBrowser } from "@/lib/supabase-client";

const SLIM_W  = 64;   // collapsed width in px
const FULL_W  = 220;  // expanded width in px

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
      { href: "/dashboard/sources",   label: "Sources",      icon: Globe },
      { href: "/dashboard/analysis",  label: "Intelligence", icon: ChartBar },
      { href: "/dashboard/ugc",       label: "UGC Creators", icon: Video },
      { href: "/dashboard/ads",       label: "Ad Studio",    icon: Megaphone },
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
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const user         = useUser();
  const supabase     = createSupabaseBrowser();

  const [expanded,         setExpanded]         = useState(false);
  const [intelligenceOpen, setIntelligenceOpen] = useState(pathname.startsWith("/dashboard/analysis"));
  const activeSection = searchParams.get("section") ?? "overview";

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Shared transition string
  const tx = "200ms cubic-bezier(0.4, 0, 0.2, 1)";

  // Label fade — delayed slightly so width animates first on expand
  const labelStyle: React.CSSProperties = {
    opacity:    expanded ? 1 : 0,
    maxWidth:   expanded ? 160 : 0,
    overflow:   "hidden",
    whiteSpace: "nowrap",
    transition: `opacity ${expanded ? "160ms 60ms" : "100ms 0ms"} ease, max-width ${tx}`,
  };

  // Group heading fade
  const groupHeadStyle: React.CSSProperties = {
    opacity:    expanded ? 1 : 0,
    maxHeight:  expanded ? 20 : 0,
    overflow:   "hidden",
    transition: `opacity ${expanded ? "160ms 80ms" : "80ms 0ms"} ease, max-height ${tx}`,
  };

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => { setExpanded(false); }}
      className="fixed inset-y-0 left-0 z-30 flex flex-col overflow-hidden"
      style={{
        width:      expanded ? FULL_W : SLIM_W,
        height:     "100vh",
        background: "linear-gradient(160deg, #1d4ed8 0%, #1e40af 60%, #1e3a8a 100%)",
        borderRight: "1px solid rgba(255,255,255,0.1)",
        transition: `width ${tx}`,
        boxShadow: expanded ? "4px 0 24px rgba(0,0,0,0.18)" : "none",
      }}
    >
      {/* ── Logo ─────────────────────────────────────────────────────────────── */}
      <div
        className="relative flex items-center shrink-0"
        style={{
          padding:    expanded ? "20px 16px 16px" : "20px 0 16px",
          justifyContent: expanded ? "flex-start" : "center",
          transition: `padding ${tx}`,
          gap: 10,
        }}
      >
        <div
          className="shrink-0 flex items-center justify-center rounded-2xl"
          style={{
            width: 36, height: 36,
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.22)",
          }}
        >
          <Image src="/logo.png" alt="Agentica" width={20} height={20} className="object-contain" />
        </div>

        <div style={{ ...labelStyle, maxWidth: expanded ? 120 : 0 }}>
          <p className="text-sm leading-none text-white font-bold" style={{ fontFamily: "var(--font-josefin)", letterSpacing: "0.08em" }}>
            AGENTICA
          </p>
          <p className="text-[9px] mt-1 uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.5)" }}>
            Dashboard
          </p>
        </div>
      </div>

      {/* ── Search (only visible when expanded) ──────────────────────────────── */}
      <div
        style={{
          opacity:    expanded ? 1 : 0,
          maxHeight:  expanded ? 52 : 0,
          overflow:   "hidden",
          paddingLeft: 12, paddingRight: 12, paddingBottom: expanded ? 12 : 0,
          transition: `opacity ${expanded ? "160ms 60ms" : "80ms 0ms"} ease, max-height ${tx}, padding ${tx}`,
        }}
      >
        <div
          className="flex items-center gap-2 rounded-2xl border px-3 py-2"
          style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.14)" }}
        >
          <MagnifyingGlass size={13} style={{ color: "rgba(255,255,255,0.45)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search"
            tabIndex={expanded ? 0 : -1}
            className="min-w-0 flex-1 bg-transparent text-xs outline-none text-white placeholder:text-white/35"
          />
          <span className="rounded border px-1 py-0.5 text-[9px]" style={{ color: "rgba(255,255,255,0.32)", borderColor: "rgba(255,255,255,0.14)" }}>⌘K</span>
        </div>
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="relative flex-1 overflow-y-auto overflow-x-hidden pb-4" style={{ paddingLeft: expanded ? 12 : 6, paddingRight: expanded ? 12 : 6, transition: `padding ${tx}` }}>
        <div className="space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              {/* Group heading — hidden when slim */}
              <p
                className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ ...groupHeadStyle, color: "rgba(255,255,255,0.42)", marginBottom: expanded ? 6 : 0 }}
              >
                {group.label}
              </p>

              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active        = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
                  const isIntelligence = href === "/dashboard/analysis";

                  const itemBase: React.CSSProperties = {
                    display:        "flex",
                    alignItems:     "center",
                    gap:            expanded ? 10 : 0,
                    justifyContent: expanded ? "flex-start" : "center",
                    borderRadius:   14,
                    padding:        expanded ? "8px 10px" : "9px",
                    fontSize:       12,
                    fontWeight:     500,
                    background:     active ? "rgba(255,255,255,0.16)" : "transparent",
                    color:          active ? "#ffffff" : "rgba(255,255,255,0.75)",
                    boxShadow:      active ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                    transition:     `background 120ms ease, padding ${tx}, gap ${tx}, justify-content ${tx}`,
                    cursor:         "pointer",
                    textDecoration: "none",
                    width:          "100%",
                  };

                  if (isIntelligence) {
                    return (
                      <div key={href}>
                        <Link
                          href={href}
                          onClick={() => { if (expanded) setIntelligenceOpen((v) => !v); }}
                          style={itemBase}
                          onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; }}
                          onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                          title={expanded ? undefined : label}
                        >
                          <Icon size={16} weight="regular" style={{ flexShrink: 0 }} />
                          <span style={{ ...labelStyle, flex: 1 }}>{label}</span>
                          <CaretRight
                            size={12}
                            style={{
                              ...labelStyle,
                              color: "rgba(255,255,255,0.38)",
                              transform: intelligenceOpen ? "rotate(90deg)" : "rotate(0deg)",
                              transition: `transform 180ms ease, ${labelStyle.transition}`,
                              flexShrink: 0,
                            }}
                          />
                        </Link>

                        {/* Sub-nav — only when expanded */}
                        <div style={{
                          maxHeight: expanded && intelligenceOpen ? `${INTELLIGENCE_SUBNAV.length * 34}px` : "0px",
                          overflow: "hidden",
                          transition: `max-height 220ms ease`,
                        }}>
                          <div className="ml-4 mt-1 border-l pl-3" style={{ borderColor: "rgba(255,255,255,0.16)" }}>
                            {INTELLIGENCE_SUBNAV.map(({ section, label: subLabel }) => {
                              const subActive = pathname.startsWith("/dashboard/analysis") && activeSection === section;
                              return (
                                <Link
                                  key={section}
                                  href={`/dashboard/analysis?section=${section}`}
                                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors"
                                  style={{ color: subActive ? "#ffffff" : "rgba(255,255,255,0.62)", background: subActive ? "rgba(255,255,255,0.1)" : "transparent" }}
                                >
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: subActive ? "#fff" : "rgba(255,255,255,0.28)" }} />
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
                      style={itemBase}
                      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; }}
                      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = active ? "rgba(255,255,255,0.16)" : "transparent"; }}
                      title={expanded ? undefined : label}
                    >
                      <Icon size={16} weight="regular" style={{ flexShrink: 0 }} />
                      <span style={labelStyle}>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* ── User footer ──────────────────────────────────────────────────────── */}
      <div
        className="relative border-t shrink-0"
        style={{
          borderColor: "rgba(255,255,255,0.12)",
          padding: expanded ? "12px 12px" : "12px 6px",
          transition: `padding ${tx}`,
        }}
      >
        {user ? (
          <div
            className="flex items-center rounded-[18px] border"
            style={{
              borderColor: "rgba(255,255,255,0.14)",
              background:  "rgba(255,255,255,0.08)",
              padding:     expanded ? "8px 10px" : "6px",
              justifyContent: expanded ? "flex-start" : "center",
              gap: expanded ? 8 : 0,
              transition: `padding ${tx}, gap ${tx}`,
            }}
          >
            <UserAvatar name={user.display_name} size={28} />

            <div style={{ ...labelStyle, maxWidth: expanded ? 110 : 0, flex: 1 }}>
              <p className="truncate text-xs font-semibold text-white">{user.display_name}</p>
              <p className="truncate text-[9px]" style={{ color: "rgba(255,255,255,0.45)" }}>{user.email}</p>
            </div>

            <button
              onClick={handleSignOut}
              title="Sign out"
              className="rounded-lg p-1.5 transition-colors shrink-0"
              style={{ ...labelStyle, color: "rgba(255,255,255,0.4)", maxWidth: expanded ? 28 : 0 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
            >
              <SignOut size={13} weight="regular" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white opacity-60 shrink-0" />
            <span style={labelStyle} className="text-[11px] text-white/60">Connected</span>
          </div>
        )}
      </div>
    </aside>
  );
}
