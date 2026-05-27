"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import {
  House, ChartBar, Lightbulb, Megaphone, Globe,
  Video, PencilLine, GearSix, UserPlus, Users,
  SignOut,
} from "@phosphor-icons/react";
import { createSupabaseBrowser } from "@/lib/supabase-client";
import { useUser } from "./UserContext";

const NAV = [
  {
    group: "Core",
    items: [
      { href: "/dashboard",              icon: House,       label: "Home"         },
      { href: "/dashboard/ideas",        icon: Lightbulb,   label: "Ideas"        },
      { href: "/dashboard/social",       icon: Users,       label: "Social"       },
    ],
  },
  {
    group: "Intel",
    items: [
      { href: "/dashboard/sources",      icon: Globe,       label: "Sources"      },
      { href: "/dashboard/analysis",     icon: ChartBar,    label: "Intelligence" },
      { href: "/dashboard/ugc",          icon: Video,       label: "UGC"          },
      { href: "/dashboard/ads",          icon: Megaphone,   label: "Ad Studio"    },
    ],
  },
  {
    group: "Settings",
    items: [
      { href: "/dashboard/brand-prompt", icon: PencilLine,  label: "Brand"        },
      { href: "/dashboard/settings",     icon: GearSix,     label: "Settings"     },
      { href: "/dashboard/team",         icon: UserPlus,    label: "Team"         },
    ],
  },
];

// Fluid blob shape that drifts in the sidebar background
function BlobShape({ style }: { style?: React.CSSProperties }) {
  return (
    <div className="absolute pointer-events-none" style={{
      borderRadius: "60% 40% 70% 30% / 50% 60% 40% 50%",
      filter: "blur(28px)",
      animation: "blob-drift 8s ease-in-out infinite",
      ...style,
    }} />
  );
}

export default function GlassSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const user     = useUser();
  const supabase = createSupabaseBrowser();
  const [hovered, setHovered] = useState<string | null>(null);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = user?.display_name
    ? user.display_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes blob-drift {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(8px,-12px) scale(1.06); }
          66%      { transform: translate(-6px,8px) scale(0.96); }
        }
        @keyframes icon-breathe {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.12); }
        }
        @keyframes pill-glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(0,122,255,0); }
          50%      { box-shadow: 0 0 12px 3px rgba(0,122,255,0.18); }
        }
      `}</style>

      <aside
        className="fixed inset-y-0 left-0 z-30 flex flex-col overflow-hidden"
        style={{
          width: 220,
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(28px) saturate(1.6)",
          WebkitBackdropFilter: "blur(28px) saturate(1.6)",
          borderRight: "1px solid rgba(255,255,255,0.55)",
          boxShadow: "4px 0 40px rgba(0,0,0,0.08)",
        }}>

        {/* Fluid background blobs */}
        <BlobShape style={{ width:120, height:120, top:-30, left:-20, background:"rgba(0,122,255,0.10)" }} />
        <BlobShape style={{ width:100, height:100, top:"40%", right:-30, background:"rgba(88,86,214,0.08)", animationDelay:"2.5s" }} />
        <BlobShape style={{ width:90,  height:90,  bottom:60, left:10,  background:"rgba(52,199,89,0.07)", animationDelay:"5s" }} />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5 px-5 pt-6 pb-5 shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background:"linear-gradient(135deg,#007AFF,#5856D6)", boxShadow:"0 4px 12px rgba(0,122,255,0.35)" }}>
            <Image src="/logo-2.png" alt="Agentica" width={18} height={18} className="object-contain" />
          </div>
          <div>
            <p className="text-[13px] font-black text-gray-900 leading-none">Agentica</p>
            <p className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-widest">Dashboard</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 overflow-y-auto px-3 pb-3 space-y-5">
          {NAV.map(({ group, items }) => (
            <div key={group}>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-gray-400 px-2 mb-1.5">{group}</p>
              <div className="space-y-0.5">
                {items.map(({ href, icon: Icon, label }) => {
                  const active = href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(href);
                  const isHov = hovered === href;

                  return (
                    <button key={href}
                      onClick={() => router.push(href)}
                      onMouseEnter={() => setHovered(href)}
                      onMouseLeave={() => setHovered(null)}
                      className="relative flex items-center gap-2.5 w-full px-3 py-2 rounded-2xl text-left transition-all"
                      style={{
                        background: active
                          ? "rgba(0,122,255,0.12)"
                          : isHov ? "rgba(0,0,0,0.04)" : "transparent",
                        animation: active ? "pill-glow 3s ease-in-out infinite" : "none",
                        transition: "background 180ms ease",
                      }}>

                      {/* Active indicator bar */}
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                          style={{ background:"#007AFF" }} />
                      )}

                      <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: active
                            ? "linear-gradient(135deg,#007AFF,#5856D6)"
                            : isHov ? "rgba(0,0,0,0.06)" : "transparent",
                          transition: "background 180ms ease",
                          animation: active ? "icon-breathe 3s ease-in-out infinite" : "none",
                        }}>
                        <Icon size={15} weight={active ? "duotone" : "regular"}
                          style={{ color: active ? "#fff" : isHov ? "#1c1c1e" : "#6b6b6b" }} />
                      </div>

                      <span className="text-[12px] font-semibold"
                        style={{ color: active ? "#007AFF" : isHov ? "#1c1c1e" : "#6b6b6b" }}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="relative shrink-0 px-3 pb-4 pt-2"
          style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl"
            style={{ background:"rgba(0,0,0,0.03)" }}>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-black text-white"
              style={{ background:"linear-gradient(135deg,#007AFF,#5856D6)" }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-800 truncate">{user?.display_name ?? "User"}</p>
              <p className="text-[9px] text-gray-400 truncate">{user?.email ?? ""}</p>
            </div>
            <button onClick={signOut} title="Sign out"
              className="p-1 rounded-lg hover:bg-black/08 transition-colors shrink-0">
              <SignOut size={13} style={{ color:"#9ca3af" }} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
