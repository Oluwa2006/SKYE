import {
  AbsoluteFill, interpolate, spring, useCurrentFrame,
  useVideoConfig, Video,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "900"] });

export interface AdTextForwardProps {
  videoUrl: string;
  hook: string;
  subtext?: string;
  cta: string;
  brandName: string;
  primaryColor?: string;
  accentColor?: string;
}

export const AdTextForward: React.FC<AdTextForwardProps> = ({
  videoUrl, hook, cta, brandName,
  subtext = "The words that matter most.",
  primaryColor = "#111111",
  accentColor  = "#6d28d9",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Phase timing ──────────────────────────────────────────────────────
  const P1_BRAND_IN  = 10;
  const P2_HOOK_IN   = fps * 2;
  const P2_HOOK_OUT  = fps * 8.5;
  const P3_SUB_IN    = fps * 9.5;
  const P3_SUB_OUT   = fps * 15;
  const P4_CTA_IN    = fps * 16;
  const FADE_DUR     = 14;

  const globalOpacity = interpolate(
    frame,
    [0, FADE_DUR, durationInFrames - FADE_DUR, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const brandOpacity = interpolate(frame, [P1_BRAND_IN, P1_BRAND_IN + 14], [0, 1], { extrapolateRight: "clamp" });

  // Hook — word-by-word stagger
  const words = hook.split(" ");
  const hookContainerOpacity = interpolate(
    frame,
    [P2_HOOK_IN, P2_HOOK_IN + 8, P2_HOOK_OUT, P2_HOOK_OUT + 12],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Subtext — character reveal feel (line appears left-to-right via clip)
  const subOpacity = interpolate(frame, [P3_SUB_IN, P3_SUB_IN + 16, P3_SUB_OUT, P3_SUB_OUT + 12], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subY       = interpolate(frame, [P3_SUB_IN, P3_SUB_IN + 18], [18, 0], { extrapolateRight: "clamp" });

  // Subtext accent bar — extends from 0 to full width
  const accentBarW = interpolate(frame, [P3_SUB_IN + 10, P3_SUB_IN + 55], [0, 400], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // CTA
  const ctaScale   = spring({ fps, frame: frame - P4_CTA_IN, config: { damping: 14, stiffness: 200 } });
  const ctaOpacity = interpolate(frame, [P4_CTA_IN, P4_CTA_IN + 12], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: globalOpacity, fontFamily, overflow: "hidden", background: "#000" }}>
      {/* Background video — heavily dimmed — text IS the ad */}
      <Video src={videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.3 }} />

      {/* Full dark overlay */}
      <AbsoluteFill style={{ background: "rgba(0,0,0,0.65)" }} />

      {/* Accent colour wash at bottom */}
      <AbsoluteFill style={{ background: `linear-gradient(to top, ${accentColor}22 0%, transparent 55%)` }} />

      {/* Vertical accent left bar */}
      <div style={{
        position: "absolute", top: 0, bottom: 0, left: 0, width: 5,
        background: `linear-gradient(to bottom, transparent, ${accentColor}, transparent)`,
        opacity: 0.7,
      }} />

      {/* Brand */}
      <div style={{
        position: "absolute", top: 64, left: 60,
        opacity: brandOpacity,
        color: "rgba(255,255,255,0.45)", fontSize: 20, fontWeight: 700,
        letterSpacing: 7, textTransform: "uppercase",
      }}>
        {brandName}
      </div>

      {/* Phase 2 — Hook word-by-word */}
      <div style={{
        position: "absolute",
        top: "44%",
        left: 56, right: 56,
        transform: "translateY(-50%)",
        opacity: hookContainerOpacity,
      }}>
        <div style={{ fontSize: 90, fontWeight: 900, color: "#fff", lineHeight: 1.0, letterSpacing: -2, textAlign: "center" }}>
          {words.map((word, i) => {
            const wOpacity = interpolate(frame, [P2_HOOK_IN + i * 5, P2_HOOK_IN + i * 5 + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const wY       = interpolate(frame, [P2_HOOK_IN + i * 5, P2_HOOK_IN + i * 5 + 12], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <span
                key={i}
                style={{ opacity: wOpacity, transform: `translateY(${wY}px)`, display: "inline-block", marginRight: "0.22em" }}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>

      {/* Phase 3 — Subtext */}
      <div style={{
        position: "absolute",
        top: "52%",
        left: 56, right: 56,
        opacity: subOpacity,
        transform: `translateY(${subY}px)`,
        textAlign: "center",
      }}>
        <div style={{
          fontSize: 38, fontWeight: 400, color: "rgba(255,255,255,0.75)",
          lineHeight: 1.4, letterSpacing: 1, fontStyle: "italic",
        }}>
          {subtext}
        </div>
        {/* Centered accent bar */}
        <div style={{
          width: accentBarW, height: 2, background: accentColor, borderRadius: 2,
          margin: "18px auto 0",
          boxShadow: `0 0 10px ${accentColor}88`,
        }} />
      </div>

      {/* Phase 4 — CTA centred */}
      <div style={{
        position: "absolute",
        bottom: 108,
        left: 0, right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: ctaOpacity,
        transform: `scale(${ctaScale})`,
      }}>
        <div style={{
          background: accentColor,
          color: "#fff",
          fontSize: 28, fontWeight: 700,
          padding: "18px 60px",
          borderRadius: 64,
          letterSpacing: 0.5,
          boxShadow: `0 8px 36px ${accentColor}66`,
        }}>
          {cta}
        </div>
      </div>
    </AbsoluteFill>
  );
};
