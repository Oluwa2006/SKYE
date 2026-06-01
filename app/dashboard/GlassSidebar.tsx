"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import {
  House, ChartBar, Lightbulb, Megaphone, Globe,
  Video, PencilLine, GearSix, UserPlus, Users, SignOut,
} from "@phosphor-icons/react";
import { createSupabaseBrowser } from "@/lib/supabase-client";
import { useUser } from "./UserContext";

const NAV = [
  { href: "/dashboard",              icon: House,       label: "Home"         },
  { href: "/dashboard/ideas",        icon: Lightbulb,   label: "Ideas"        },
  { href: "/dashboard/analysis",     icon: ChartBar,    label: "Intelligence" },
  { href: "/dashboard/ads",          icon: Megaphone,   label: "Ad Studio"    },
  { href: "/dashboard/sources",      icon: Globe,       label: "Sources"      },
  { href: "/dashboard/ugc",          icon: Video,       label: "UGC"          },
  { href: "/dashboard/social",       icon: Users,       label: "Social"       },
  { href: "/dashboard/brand-prompt", icon: PencilLine,  label: "Brand"        },
  { href: "/dashboard/settings",     icon: GearSix,     label: "Settings"     },
  { href: "/dashboard/team",         icon: UserPlus,    label: "Team"         },
];

export default function GlassSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const user     = useUser();
  const supabase = createSupabaseBrowser();
  const [tooltip, setTooltip] = useState<string | null>(null);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = user?.display_name
    ? user.display_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <aside
      className="fixed left-3 top-3 bottom-3 z-30 flex flex-col items-center py-4 gap-1"
      style={{
        width: 56,
        borderRadius: 22,
        background: "rgba(248,248,252,0.82)",
        backdropFilter: "blur(40px) saturate(2) brightness(1.05)",
        WebkitBackdropFilter: "blur(40px) saturate(2) brightness(1.05)",
        border: "1px solid rgba(255,255,255,0.7)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.07), 0 1px 0 rgba(255,255,255,1) inset, 0 -1px 0 rgba(0,0,0,0.03) inset",
      }}>

      {/* Logo */}
      <div className="mb-3 shrink-0">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background:"linear-gradient(135deg,#007AFF,#5856D6)", boxShadow:"0 3px 10px rgba(0,122,255,0.35)" }}>
          <Image src="/logo-2.png" alt="" width={16} height={16} className="object-contain" />
        </div>
      </div>

      {/* Divider */}
      <div className="w-7 h-px mb-2 shrink-0" style={{ background:"rgba(0,0,0,0.08)" }} />

      {/* Nav icons */}
      <div className="flex-1 flex flex-col items-center gap-0.5 overflow-y-auto w-full px-2">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(href);

          return (
            <div key={href} className="relative w-full flex justify-center">
              <button
                onClick={() => router.push(href)}
                onMouseEnter={() => setTooltip(label)}
                onMouseLeave={() => setTooltip(null)}
                className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all"
                style={{
                  background: active ? "linear-gradient(135deg,#007AFF,#5856D6)" : "transparent",
                  boxShadow:  active ? "0 4px 12px rgba(0,122,255,0.3)" : "none",
                  transform:  tooltip === label && !active ? "scale(1.1)" : "scale(1)",
                  transition: "all 160ms cubic-bezier(0.34,1.56,0.64,1)",
                }}>
                <Icon
                  size={16}
                  weight={active ? "fill" : "regular"}
                  style={{ color: active ? "#fff" : tooltip === label ? "#007AFF" : "#8e8e93" }}
                />
              </button>

              {/* Tooltip */}
              {tooltip === label && (
                <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-50">
                  <div className="px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap"
                    style={{
                      background: "rgba(28,28,30,0.85)",
                      backdropFilter: "blur(8px)",
                      color: "#fff",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}>
                    {label}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-7 h-px mt-2 mb-2 shrink-0" style={{ background:"rgba(0,0,0,0.08)" }} />

      {/* User + sign out */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0"
          style={{ background:"linear-gradient(135deg,#007AFF,#5856D6)" }}>
          {initials}
        </div>
        <button onClick={signOut} title="Sign out"
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-black/05">
          <SignOut size={13} style={{ color:"#8e8e93" }} />
        </button>
      </div>
    </aside>
  );
}
