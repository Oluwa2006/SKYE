import {
  AbsoluteFill, interpolate, spring, useCurrentFrame,
  useVideoConfig, Video,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";

const { fontFamily } = loadFont("normal", { weights: ["900"] });

export interface AdEnergeticProps {
  videoUrl: string;
  hook: string;
  subtext?: string;
  cta: string;
  brandName: string;
  primaryColor?: string;
  accentColor?: string;
}

export const AdEnergetic: React.FC<AdEnergeticProps> = ({
  videoUrl, hook, cta, brandName,
  subtext = "Don't wait. Act now.",
  primaryColor = "#b91c1c",
  accentColor  = "#ef4444",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Phase timing ──────────────────────────────────────────────────────
  const P1_BRAND_IN = 4;
  const P2_HOOK_IN  = fps * 1.5;              // fast hook — 1.5s
  const P2_HOOK_OUT = fps * 7;
  const P3_SUB_IN   = fps * 8;
  const P3_SUB_OUT  = fps * 14.5;
  const P4_CTA_IN   = fps * 16;
  const FADE_DUR    = 10;

  const globalOpacity = interpolate(
    frame,
    [0, FADE_DUR, durationInFrames - FADE_DUR, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const brandOpacity = interpolate(frame, [P1_BRAND_IN, P1_BRAND_IN + 10], [0, 1], { extrapolateRight: "clamp" });

  // Hook — fast snap
  const hookScale   = spring({ fps, frame: frame - P2_HOOK_IN, config: { damping: 9, stiffness: 340 } });
  const hookOpacity = interpolate(frame, [P2_HOOK_IN, P2_HOOK_IN + 8, P2_HOOK_OUT, P2_HOOK_OUT + 10], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Subtext — punchy secondary line
  const subScale   = spring({ fps, frame: frame - P3_SUB_IN, config: { damping: 10, stiffness: 300 } });
  const subOpacity = interpolate(frame, [P3_SUB_IN, P3_SUB_IN + 10, P3_SUB_OUT, P3_SUB_OUT + 10], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Countdown-style line — sweeps across
  const sweepWidth = interpolate(frame, [P3_SUB_IN + 4, P3_SUB_IN + 30], [0, 1080], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // CTA — punch
  const ctaScale   = spring({ fps, frame: frame - P4_CTA_IN, config: { damping: 7, stiffness: 400 } });
  const ctaOpacity = interpolate(frame, [P4_CTA_IN, P4_CTA_IN + 8], [0, 1], { extrapolateRight: "clamp" });

  // Pulse effect on video
  const pulseOpacity = interpolate(
    frame % (fps * 0.5),
    [0, fps * 0.25, fps * 0.5],
    [0, 0.05, 0],
    { extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ opacity: globalOpacity, fontFamily, overflow: "hidden", background: "#000" }}>
      {/* Background video — high energy treatment */}
      <Video src={videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.15) saturate(1.25)" }} />

      {/* Dark overlay */}
      <AbsoluteFill style={{ background: "rgba(0,0,0,0.38)" }} />

      {/* Subtle pulse */}
      <AbsoluteFill style={{ background: accentColor, opacity: pulseOpacity, mixBlendMode: "screen" }} />

      {/* Bottom gradient */}
      <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 52%)" }} />

      {/* Accent top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: `linear-gradient(90deg, ${accentColor}, ${primaryColor})` }} />

      {/* Brand */}
      <div style={{
        position: "absolute", top: 52, left: 56,
        opacity: brandOpacity,
        color: "#fff", fontSize: 22, fontWeight: 900,
        letterSpacing: 7, textTransform: "uppercase",
      }}>
        {brandName}
      </div>

      {/* Phase 2 — Hook large + fast */}
      <div style={{
        position: "absolute",
        bottom: 300,
        left: 48, right: 48,
        opacity: hookOpacity,
        transform: `scale(${hookScale})`,
        transformOrigin: "left bottom",
      }}>
        <div style={{
          fontSize: 84, fontWeight: 900, color: "#fff",
          lineHeight: 0.98, letterSpacing: -2,
          textTransform: "uppercase",
          textShadow: `0 5px 0 ${primaryColor}`,
        }}>
          {hook}
        </div>
      </div>

      {/* Phase 3 — Subtext snap-in */}
      <div style={{
        position: "absolute",
        bottom: 290,
        left: 48, right: 48,
        opacity: subOpacity,
        transform: `scale(${subScale})`,
        transformOrigin: "left bottom",
      }}>
        <div style={{
          fontSize: 44, fontWeight: 900, color: accentColor,
          lineHeight: 1.1, letterSpacing: -1,
          textTransform: "uppercase",
          textShadow: `0 3px 0 ${primaryColor}88`,
        }}>
          {subtext}
        </div>
        {/* Sweep line */}
        <div style={{
          position: "absolute",
          top: -16, left: 0,
          width: sweepWidth, height: 4,
          background: `linear-gradient(90deg, ${accentColor}, transparent)`,
        }} />
      </div>

      {/* Phase 4 — CTA hard punch */}
      <div style={{
        position: "absolute",
        bottom: 96,
        left: 48,
        opacity: ctaOpacity,
        transform: `scale(${ctaScale})`,
        transformOrigin: "left center",
      }}>
        <div style={{
          display: "inline-block",
          background: accentColor,
          color: "#fff",
          fontSize: 32, fontWeight: 900,
          padding: "20px 60px",
          borderRadius: 8,
          letterSpacing: 2,
          textTransform: "uppercase",
          boxShadow: `0 0 50px ${accentColor}99, 0 4px 0 ${primaryColor}`,
        }}>
          {cta}
        </div>
      </div>
    </AbsoluteFill>
  );
};
