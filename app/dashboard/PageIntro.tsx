"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "./UserContext";

const TITLES: Record<string, string> = {
  "/dashboard":              "", // handled separately with welcome message
  "/dashboard/ideas":        "Ideas",
  "/dashboard/sources":      "Sources",
  "/dashboard/analysis":     "Intelligence",
  "/dashboard/ads":          "Ad Studio",
  "/dashboard/ugc":          "UGC Creators",
  "/dashboard/social":       "Social",
  "/dashboard/brand-prompt": "Brand Prompt",
  "/dashboard/settings":     "Settings",
  "/dashboard/team":         "Team",
};

export default function PageIntro() {
  const pathname = usePathname();
  const user     = useUser();
  const [visible, setVisible] = useState(true);

  // Reset animation every time the route changes
  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(t);
  }, [pathname]);

  // No intro on the home dashboard — the collage speaks for itself
  if (pathname === "/dashboard") return null;

  const label = TITLES[pathname] ?? "";
  if (!label) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={pathname}
          className="fixed inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 9990 }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -40, transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] } }}>

          {/* Soft backdrop — barely-there so content shows through */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(248,249,251,0.72)", backdropFilter: "blur(2px)" }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
          />

          {/* Title */}
          <motion.h1
            className="relative font-black text-gray-900 select-none"
            style={{ fontSize: "clamp(2rem, 6vw, 4rem)", letterSpacing: "-0.03em" }}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0,  opacity: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ y: -56, opacity: 0, transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] } }}>
            {label}
          </motion.h1>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
