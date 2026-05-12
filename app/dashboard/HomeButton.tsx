"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { House } from "@phosphor-icons/react";

export default function HomeButton() {
  const pathname = usePathname();
  const router   = useRouter();
  const [hovered, setHovered] = useState(false);

  if (pathname === "/dashboard") return null;

  return (
    <button
      onClick={() => router.push("/dashboard")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Back to Dashboard"
      style={{
        position:       "fixed",
        top:            16,
        left:           16,
        zIndex:         99999,
        width:          38,
        height:         38,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        borderRadius:   10,
        border:         hovered ? "1px solid #1e3a8a" : "1px solid rgba(16,16,16,0.09)",
        background:     hovered ? "#1e3a8a" : "rgba(255,255,255,0.95)",
        boxShadow:      hovered ? "0 4px 16px rgba(30,58,138,0.35)" : "0 2px 10px rgba(0,0,0,0.10)",
        backdropFilter: "blur(8px)",
        cursor:         "pointer",
        transition:     "background 150ms ease, border 150ms ease, box-shadow 150ms ease",
      }}
    >
      <House size={17} weight="duotone" color={hovered ? "#ffffff" : "#1e3a8a"} />
    </button>
  );
}
