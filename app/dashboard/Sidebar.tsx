"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Lightbulb, Users, BarChart2, Globe,
  Video, Settings, PenLine, UserPlus, LogOut, Clapperboard, Megaphone,
  Search, ChevronRight,
} from "lucide-react";
import { useUser } from "./UserContext";
import { createSupabaseBrowser } from "@/lib/supabase-client";

const INTELLIGENCE_SUBNAV = [
  { section: "overview", label: "Overview" },
  { section: "my-content", label: "My Content" },
  { section: "competitors", label: "Competitors" },
  { section: "audience", label: "Audience" },
  { section: "actions", label: "Actions" },
  { section: "learning", label: "Learning Log" },
];

const navGroups = [
  {
    label: "Core",
    items: [
      { href: "/dashboard", label: "Home", icon: LayoutDashboard },
      { href: "/dashboard/ideas", label: "Ideas", icon: Lightbulb },
      { href: "/dashboard/social", label: "Social", icon: Users },
    ],
  },
  {
    label: "Intel",
    items: [
      { href: "/dashboard/sources", label: "Sources", icon: Globe },
      { href: "/dashboard/analysis", label: "Intelligence", icon: BarChart2 },
      { href: "/dashboard/ugc", label: "UGC Creators", icon: Video },
      { href: "/dashboard/video", label: "Video Studio", icon: Clapperboard },
      { href: "/dashboard/ads", label: "Ad Studio", icon: Megaphone },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/dashboard/brand-prompt", label: "Brand Prompt", icon: PenLine },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
      { href: "/dashboard/team", label: "Team", icon: UserPlus },
    ],
  },
];

const ACTIVE_BG = "rgba(255,255,255,0.12)";
const HOVER_BG = "rgba(255,255,255,0.06)";
const ACTIVE_CLR = "#ffffff";
const DEFAULT_CLR = "rgba(255,255,255,0.78)";
const LABEL_CLR = "rgba(255,255,255,0.42)";
const BORDER_CLR = "rgba(255,255,255,0.1)";

function UserAvatar({ name, size = 30 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0 text-[10px] font-bold"
      style={{
        background: "rgba(255,255,255,0.14)",
        color: "#ffffff",
        border: `1px solid ${BORDER_CLR}`,
        width: size,
        height: size,
      }}
    >
      {initials}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useUser();
  const supabase = createSupabaseBrowser();

  const [intelligenceOpen, setIntelligenceOpen] = useState(pathname.startsWith("/dashboard/analysis"));
  const [searchFocused, setSearchFocused] = useState(false);
  const activeSection = searchParams.get("section") ?? "overview";

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="fixed inset-y-0 left-0 z-20 flex flex-col"
      style={{
        width: "220px",
        height: "100vh",
        background: "rgba(255,255,255,0.03)",
        borderRight: `1px solid ${BORDER_CLR}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 shrink-0 flex items-center justify-center rounded-2xl border" style={{ borderColor: BORDER_CLR, background: "rgba(255,255,255,0.04)" }}>
            <Image src="/logo.png" alt="SKYE" width={22} height={22} className="w-5.5 h-5.5 object-contain" />
          </div>
          <div>
            <p className="text-base leading-none" style={{ color: "#ffffff", fontFamily: "var(--font-josefin)", letterSpacing: "0.08em" }}>
              SKYE
            </p>
            <p className="text-[10px] mt-1 uppercase tracking-[0.18em]" style={{ color: LABEL_CLR }}>
              Dashboard
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div
          className="flex items-center gap-2 rounded-2xl border px-3 py-2.5"
          style={{
            background: searchFocused ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
            borderColor: searchFocused ? "rgba(255,255,255,0.18)" : BORDER_CLR,
          }}
        >
          <Search size={14} style={{ color: LABEL_CLR }} />
          <input
            type="text"
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-xs outline-none"
            style={{ color: DEFAULT_CLR }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <span className="rounded-md border px-1.5 py-0.5 text-[10px]" style={{ color: LABEL_CLR, borderColor: BORDER_CLR }}>
            ⌘K
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: LABEL_CLR }}>
                {group.label}
              </p>

              <div className="space-y-1">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
                  const isIntelligence = href === "/dashboard/analysis";

                  if (isIntelligence) {
                    return (
                      <div key={href}>
                        <Link
                          href={href}
                          onClick={() => setIntelligenceOpen((value) => !value)}
                          className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-xs font-medium transition-colors"
                          style={{
                            background: active ? ACTIVE_BG : "transparent",
                            color: active ? ACTIVE_CLR : DEFAULT_CLR,
                          }}
                          onMouseEnter={(e) => {
                            if (!active) (e.currentTarget as HTMLElement).style.background = HOVER_BG;
                          }}
                          onMouseLeave={(e) => {
                            if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                          }}
                        >
                          <Icon size={15} strokeWidth={1.8} className="shrink-0" />
                          <span className="flex-1">{label}</span>
                          <ChevronRight
                            size={13}
                            strokeWidth={1.8}
                            style={{
                              color: LABEL_CLR,
                              transform: intelligenceOpen ? "rotate(90deg)" : "rotate(0deg)",
                              transition: "transform 180ms ease",
                            }}
                          />
                        </Link>

                        <div
                          style={{
                            maxHeight: intelligenceOpen ? `${INTELLIGENCE_SUBNAV.length * 34}px` : "0px",
                            overflow: "hidden",
                            transition: "max-height 220ms ease",
                          }}
                        >
                          <div className="ml-4 mt-1 border-l pl-3" style={{ borderColor: BORDER_CLR }}>
                            {INTELLIGENCE_SUBNAV.map(({ section, label: subLabel }) => {
                              const subActive = pathname.startsWith("/dashboard/analysis") && activeSection === section;
                              return (
                                <Link
                                  key={section}
                                  href={`/dashboard/analysis?section=${section}`}
                                  className="flex items-center gap-2 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors"
                                  style={{
                                    color: subActive ? "#ffffff" : DEFAULT_CLR,
                                    background: subActive ? "rgba(255,255,255,0.08)" : "transparent",
                                  }}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: subActive ? "#ffffff" : "rgba(255,255,255,0.22)" }} />
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
                      className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-xs font-medium transition-colors"
                      style={{
                        background: active ? ACTIVE_BG : "transparent",
                        color: active ? ACTIVE_CLR : DEFAULT_CLR,
                      }}
                      onMouseEnter={(e) => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = HOVER_BG;
                      }}
                      onMouseLeave={(e) => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <Icon size={15} strokeWidth={1.8} className="shrink-0" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="px-4 py-4 border-t" style={{ borderColor: BORDER_CLR }}>
        <div className="rounded-[22px] border px-3 py-3" style={{ borderColor: BORDER_CLR, background: "rgba(255,255,255,0.04)" }}>
          {user ? (
            <div className="flex items-center gap-2.5">
              <UserAvatar name={user.display_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{user.display_name}</p>
                <p className="truncate text-[10px]" style={{ color: LABEL_CLR }}>
                  {user.email}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="rounded-lg p-2 transition-colors"
                style={{ color: LABEL_CLR }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLElement).style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = LABEL_CLR;
                }}
              >
                <LogOut size={13} strokeWidth={1.8} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white" />
              <p className="text-[11px]" style={{ color: DEFAULT_CLR }}>
                Connected
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
