import {
  AbsoluteFill, interpolate, spring, useCurrentFrame,
  useVideoConfig, Video,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "800"] });

export interface AdLifestyleProps {
  videoUrl: string;
  hook: string;
  subtext?: string;
  cta: string;
  brandName: string;
  primaryColor?: string;
  accentColor?: string;
}

export const AdLifestyle: React.FC<AdLifestyleProps> = ({
  videoUrl, hook, cta, brandName,
  subtext = "Built for real life.",
  primaryColor = "#1a1a1a",
  accentColor  = "#e07b4a",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Phase timing ──────────────────────────────────────────────────────
  const P1_BRAND_IN = 10;
  const P2_HOOK_IN  = fps * 2;
  const P2_HOOK_OUT = fps * 8;
  const P3_SUB_IN   = fps * 9;
  const P3_SUB_OUT  = fps * 15;
  const P4_CTA_IN   = fps * 16;
  const FADE_DUR    = 16;

  const globalOpacity = interpolate(
    frame,
    [0, FADE_DUR, durationInFrames - FADE_DUR, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const brandOpacity = interpolate(frame, [P1_BRAND_IN, P1_BRAND_IN + 16], [0, 1], { extrapolateRight: "clamp" });

  // Hook
  const hookOpacity = interpolate(frame, [P2_HOOK_IN, P2_HOOK_IN + 18, P2_HOOK_OUT, P2_HOOK_OUT + 14], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hookY       = interpolate(frame, [P2_HOOK_IN, P2_HOOK_IN + 20], [26, 0], { extrapolateRight: "clamp" });

  // Subtext
  const subOpacity = interpolate(frame, [P3_SUB_IN, P3_SUB_IN + 18, P3_SUB_OUT, P3_SUB_OUT + 14], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subY       = interpolate(frame, [P3_SUB_IN, P3_SUB_IN + 20], [22, 0], { extrapolateRight: "clamp" });

  // Dot indicators (lifestyle dots)
  const dot1 = interpolate(frame, [P3_SUB_IN + 5, P3_SUB_IN + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dot2 = interpolate(frame, [P3_SUB_IN + 14, P3_SUB_IN + 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dot3 = interpolate(frame, [P3_SUB_IN + 22, P3_SUB_IN + 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // CTA
  const ctaOpacity = interpolate(frame, [P4_CTA_IN, P4_CTA_IN + 16], [0, 1], { extrapolateRight: "clamp" });
  const ctaY       = spring({ fps, frame: frame - P4_CTA_IN, config: { damping: 16, stiffness: 180 } });

  // Slow zoom
  const videoScale = interpolate(frame, [0, durationInFrames], [1, 1.05], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: globalOpacity, fontFamily, overflow: "hidden", background: "#000" }}>
      {/* Background video */}
      <AbsoluteFill style={{ transform: `scale(${videoScale})`, transformOrigin: "center center" }}>
        <Video src={videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      {/* Warm bottom gradient */}
      <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.28) 40%, transparent 65%)" }} />

      {/* Top gradient */}
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 30%)" }} />

      {/* Brand */}
      <div style={{
        position: "absolute", top: 56, left: 56,
        opacity: brandOpacity,
        color: "rgba(255,255,255,0.75)", fontSize: 22, fontWeight: 600,
        letterSpacing: 5, textTransform: "uppercase",
      }}>
        {brandName}
      </div>

      {/* Accent dot after brand */}
      <div style={{
        position: "absolute", top: 72, left: 56 + brandName.length * 14 + 20,
        width: 6, height: 6, borderRadius: "50%",
        background: accentColor,
        opacity: brandOpacity,
      }} />

      {/* Phase 2 — Hook */}
      <div style={{
        position: "absolute",
        bottom: 260,
        left: 56, right: 56,
        opacity: hookOpacity,
        transform: `translateY(${hookY}px)`,
      }}>
        <div style={{
          fontSize: 70, fontWeight: 800, color: "#fff",
          lineHeight: 1.1, letterSpacing: -0.5,
          textShadow: "0 2px 20px rgba(0,0,0,0.55)",
        }}>
          {hook}
        </div>
      </div>

      {/* Phase 3 — Subtext + lifestyle dots */}
      <div style={{
        position: "absolute",
        bottom: 240,
        left: 56, right: 56,
        opacity: subOpacity,
        transform: `translateY(${subY}px)`,
      }}>
        <div style={{
          fontSize: 38, fontWeight: 400, color: "rgba(255,255,255,0.82)",
          lineHeight: 1.4, letterSpacing: 0.3,
        }}>
          {subtext}
        </div>
        {/* Animated dots */}
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          {[dot1, dot2, dot3].map((d, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%",
              background: accentColor, opacity: d,
            }} />
          ))}
        </div>
      </div>

      {/* Phase 4 — CTA */}
      <div style={{
        position: "absolute",
        bottom: 96,
        left: 56,
        opacity: ctaOpacity,
        transform: `translateY(${(1 - ctaY) * 20}px)`,
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 14,
          color: "#fff", fontSize: 30, fontWeight: 600,
        }}>
          <span>{cta}</span>
          <span style={{ fontSize: 26, opacity: 0.7 }}>→</span>
        </div>
        <div style={{ height: 2.5, background: accentColor, borderRadius: 2, marginTop: 10, width: "100%" }} />
      </div>
    </AbsoluteFill>
  );
};
