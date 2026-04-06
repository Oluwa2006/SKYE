import {
  AbsoluteFill, interpolate, spring, useCurrentFrame,
  useVideoConfig, Video,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "900"] });

export interface AdCinematicProps {
  videoUrl: string;
  hook: string;
  subtext?: string;
  cta: string;
  brandName: string;
  primaryColor?: string;
  accentColor?: string;
}

export const AdCinematic: React.FC<AdCinematicProps> = ({
  videoUrl, hook, cta, brandName,
  subtext = "Experience the difference.",
  primaryColor = "#1a0a0a",
  accentColor  = "#c9a84c",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Phase timing (20s = 600f @ 30fps) ────────────────────────────────
  const P1_BRAND_IN  = 12;                     // brand fades in
  const P2_HOOK_IN   = fps * 2;                // 2s  — hook appears
  const P2_HOOK_OUT  = fps * 8;                // 8s  — hook fades
  const P3_SUB_IN    = fps * 9;                // 9s  — subtext
  const P3_SUB_OUT   = fps * 15;               // 15s — subtext fades
  const P4_CTA_IN    = fps * 16;               // 16s — CTA
  const FADE_DUR     = 18;

  // Global fade in/out
  const globalOpacity = interpolate(
    frame,
    [0, FADE_DUR, durationInFrames - FADE_DUR, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Brand name
  const brandOpacity = interpolate(frame, [P1_BRAND_IN, P1_BRAND_IN + 18], [0, 1], { extrapolateRight: "clamp" });

  // Hook — large, dramatic
  const hookOpacity = interpolate(frame, [P2_HOOK_IN, P2_HOOK_IN + 18, P2_HOOK_OUT, P2_HOOK_OUT + 14], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hookY       = interpolate(frame, [P2_HOOK_IN, P2_HOOK_IN + 20], [28, 0], { extrapolateRight: "clamp" });

  // Subtext — secondary message
  const subOpacity = interpolate(frame, [P3_SUB_IN, P3_SUB_IN + 18, P3_SUB_OUT, P3_SUB_OUT + 14], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subY       = interpolate(frame, [P3_SUB_IN, P3_SUB_IN + 20], [20, 0], { extrapolateRight: "clamp" });

  // Accent line under subtext
  const lineWidth = interpolate(frame, [P3_SUB_IN + 10, P3_SUB_IN + 40], [0, 200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // CTA
  const ctaScale   = spring({ fps, frame: frame - P4_CTA_IN, config: { damping: 14, stiffness: 200 } });
  const ctaOpacity = interpolate(frame, [P4_CTA_IN, P4_CTA_IN + 14], [0, 1], { extrapolateRight: "clamp" });

  // Slow Ken Burns zoom on video
  const videoScale = interpolate(frame, [0, durationInFrames], [1, 1.06], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const BAR = 88;

  return (
    <AbsoluteFill style={{ opacity: globalOpacity, fontFamily, overflow: "hidden", background: "#000" }}>
      {/* Background video — slow zoom */}
      <AbsoluteFill style={{ transform: `scale(${videoScale})`, transformOrigin: "center center" }}>
        <Video src={videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      {/* Warm amber cinematic tint */}
      <AbsoluteFill style={{ background: "rgba(160, 90, 10, 0.18)", mixBlendMode: "multiply" }} />

      {/* Vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.65) 100%)" }} />

      {/* Bottom scrim */}
      <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 40%, transparent 60%)" }} />

      {/* Letterbox bars */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: BAR, background: "#000" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: BAR, background: "#000" }} />

      {/* Brand name */}
      <div style={{
        position: "absolute", top: BAR + 36, left: 64,
        opacity: brandOpacity,
        color: "rgba(255,255,255,0.55)", fontSize: 20, fontWeight: 700,
        letterSpacing: 9, textTransform: "uppercase",
      }}>
        {brandName}
      </div>

      {/* Accent divider line top */}
      <div style={{
        position: "absolute", top: BAR + 32, left: 64,
        width: interpolate(frame, [P1_BRAND_IN + 10, P1_BRAND_IN + 50], [0, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        height: 1, background: accentColor, opacity: 0.5,
        marginTop: 34,
      }} />

      {/* Phase 2 — Hook */}
      <div style={{
        position: "absolute",
        bottom: BAR + 220,
        left: 64, right: 64,
        opacity: hookOpacity,
        transform: `translateY(${hookY}px)`,
      }}>
        <div style={{
          fontSize: 76, fontWeight: 900, color: "#fff",
          lineHeight: 1.05, letterSpacing: -1,
          textShadow: "0 4px 32px rgba(0,0,0,0.7)",
        }}>
          {hook}
        </div>
      </div>

      {/* Phase 3 — Subtext */}
      <div style={{
        position: "absolute",
        bottom: BAR + 220,
        left: 64, right: 64,
        opacity: subOpacity,
        transform: `translateY(${subY}px)`,
      }}>
        <div style={{
          fontSize: 42, fontWeight: 400, color: "rgba(255,255,255,0.88)",
          lineHeight: 1.3, letterSpacing: 0.5,
          textShadow: "0 2px 16px rgba(0,0,0,0.6)",
          fontStyle: "italic",
        }}>
          {subtext}
        </div>
        {/* Animated accent underline */}
        <div style={{ width: lineWidth, height: 2, background: accentColor, borderRadius: 2, marginTop: 20 }} />
      </div>

      {/* Phase 4 — CTA */}
      <div style={{
        position: "absolute",
        bottom: BAR + 60,
        left: 64,
        opacity: ctaOpacity,
        transform: `scale(${ctaScale})`,
        transformOrigin: "left center",
      }}>
        <div style={{
          display: "inline-block",
          background: accentColor,
          color: "#000",
          fontSize: 26,
          fontWeight: 900,
          padding: "18px 52px",
          borderRadius: 60,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          boxShadow: `0 8px 40px ${accentColor}77`,
        }}>
          {cta}
        </div>
      </div>
    </AbsoluteFill>
  );
};
