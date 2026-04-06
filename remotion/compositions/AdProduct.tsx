import {
  AbsoluteFill, interpolate, spring, useCurrentFrame,
  useVideoConfig, Video,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";

const { fontFamily } = loadFont("normal", { weights: ["500", "700", "900"] });

export interface AdProductProps {
  videoUrl: string;
  hook: string;
  subtext?: string;
  cta: string;
  brandName: string;
  primaryColor?: string;
  accentColor?: string;
}

export const AdProduct: React.FC<AdProductProps> = ({
  videoUrl, hook, cta, brandName,
  subtext = "Premium quality. Proven results.",
  primaryColor = "#0369a1",
  accentColor  = "#38bdf8",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Phase timing ──────────────────────────────────────────────────────
  const P1_BADGE_IN  = 4;
  const P2_HOOK_IN   = fps * 2;
  const P2_HOOK_OUT  = fps * 8;
  const P3_SUB_IN    = fps * 9;
  const P3_SUB_OUT   = fps * 15;
  const P4_CTA_IN    = fps * 16;
  const FADE_DUR     = 16;

  const globalOpacity = interpolate(
    frame,
    [0, FADE_DUR, durationInFrames - FADE_DUR, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Badge
  const badgeScale = spring({ fps, frame: frame - P1_BADGE_IN, config: { damping: 14, stiffness: 200 } });

  // Hook
  const hookOpacity = interpolate(frame, [P2_HOOK_IN, P2_HOOK_IN + 16, P2_HOOK_OUT, P2_HOOK_OUT + 14], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hookX       = interpolate(frame, [P2_HOOK_IN, P2_HOOK_IN + 18], [-30, 0], { extrapolateRight: "clamp" });

  // Subtext — slides up from below hook area
  const subOpacity = interpolate(frame, [P3_SUB_IN, P3_SUB_IN + 18, P3_SUB_OUT, P3_SUB_OUT + 14], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subX       = interpolate(frame, [P3_SUB_IN, P3_SUB_IN + 18], [-24, 0], { extrapolateRight: "clamp" });

  // Feature bar width
  const barWidth = interpolate(frame, [P3_SUB_IN + 8, P3_SUB_IN + 50], [0, 280], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // CTA
  const ctaScale   = spring({ fps, frame: frame - P4_CTA_IN, config: { damping: 12, stiffness: 220 } });
  const ctaOpacity = interpolate(frame, [P4_CTA_IN, P4_CTA_IN + 12], [0, 1], { extrapolateRight: "clamp" });

  const videoScale = interpolate(frame, [0, durationInFrames], [1, 1.05], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: globalOpacity, fontFamily, overflow: "hidden", background: "#000" }}>
      {/* Background video */}
      <AbsoluteFill style={{ transform: `scale(${videoScale})`, transformOrigin: "center center" }}>
        <Video src={videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      {/* Bottom scrim */}
      <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 45%, transparent 65%)" }} />

      {/* Accent top line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 4,
        background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`,
      }} />

      {/* Brand badge top-right */}
      <div style={{
        position: "absolute", top: 52, right: 56,
        transform: `scale(${badgeScale})`,
        transformOrigin: "right top",
        background: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.2)",
        color: "#fff",
        fontSize: 19, fontWeight: 700, letterSpacing: 3,
        textTransform: "uppercase",
        padding: "12px 28px",
        borderRadius: 40,
      }}>
        {brandName}
      </div>

      {/* Phase 2 — Hook */}
      <div style={{
        position: "absolute",
        bottom: 280,
        left: 56, right: 56,
        opacity: hookOpacity,
        transform: `translateX(${hookX}px)`,
      }}>
        <div style={{
          fontSize: 68, fontWeight: 900, color: "#fff",
          lineHeight: 1.08, letterSpacing: -0.5,
          textShadow: "0 2px 24px rgba(0,0,0,0.65)",
        }}>
          {hook}
        </div>
      </div>

      {/* Phase 3 — Subtext + feature bar */}
      <div style={{
        position: "absolute",
        bottom: 270,
        left: 56, right: 56,
        opacity: subOpacity,
        transform: `translateX(${subX}px)`,
      }}>
        <div style={{
          fontSize: 38, fontWeight: 500, color: "rgba(255,255,255,0.85)",
          lineHeight: 1.35, letterSpacing: 0.2,
        }}>
          {subtext}
        </div>
        {/* Gradient feature bar */}
        <div style={{
          width: barWidth, height: 3, borderRadius: 3,
          background: `linear-gradient(90deg, ${accentColor}, ${primaryColor})`,
          marginTop: 18,
          boxShadow: `0 0 12px ${accentColor}66`,
        }} />
      </div>

      {/* Phase 4 — CTA */}
      <div style={{
        position: "absolute",
        bottom: 100,
        left: 56,
        opacity: ctaOpacity,
        transform: `scale(${ctaScale})`,
        transformOrigin: "left center",
      }}>
        <div style={{
          display: "inline-block",
          background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`,
          color: "#fff",
          fontSize: 28, fontWeight: 700,
          padding: "18px 56px",
          borderRadius: 64,
          letterSpacing: 0.5,
          boxShadow: `0 12px 40px ${primaryColor}66`,
        }}>
          {cta}
        </div>
      </div>
    </AbsoluteFill>
  );
};
