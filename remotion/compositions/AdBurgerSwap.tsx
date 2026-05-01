import {
  AbsoluteFill, interpolate, spring, useCurrentFrame,
  useVideoConfig, Img,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "900"] });

export interface AdBurgerSwapProps {
  imageUrl: string;
  headline: string;
  subtext?: string;
  ctaText: string;
  brandName: string;
  primaryColor?: string;
  accentColor?: string;
}

// The Swap — full 30s pre-animated ad. Only imageUrl changes between renders.
// Every motion, timing, and colour treatment is locked in the composition.
export const AdBurgerSwap: React.FC<AdBurgerSwapProps> = ({
  imageUrl,
  headline,
  subtext = "One experience changes everything.",
  ctaText,
  brandName,
  primaryColor = "#0f172a",
  accentColor  = "#f97316",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Timing (30s = 900 frames @ 30fps) ────────────────────────────────────
  const P1_BRAND_IN   = 12;                // brand tag slides in
  const P2_BG_IN      = fps * 0.6;         // colour bg floods up from bottom
  const P3_IMAGE_IN   = fps * 1.4;         // product SLAMS in from scale 0
  const P4_HOOK_IN    = fps * 4.5;         // hook text
  const P5_WORDS_IN   = fps * 7.5;         // word-by-word secondary line
  const P6_CTA_IN     = fps * 12;          // CTA
  const P7_HOLD_START = fps * 15;          // hold + float until end
  const FADE_DUR      = 20;

  // Global
  const globalOpacity = interpolate(
    frame,
    [0, FADE_DUR, durationInFrames - FADE_DUR, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ── Phase 2: Background colour panel floods up ────────────────────────────
  const bgHeight = interpolate(
    frame,
    [P2_BG_IN, P2_BG_IN + fps * 0.7],
    [0, 1920],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ── Phase 3: Product slam ─────────────────────────────────────────────────
  const slamSpring  = spring({ fps, frame: frame - P3_IMAGE_IN, config: { damping: 9, stiffness: 260 } });
  const imageScale  = interpolate(slamSpring, [0, 1], [0, 1.0]);
  const imageOpacity = interpolate(frame, [P3_IMAGE_IN, P3_IMAGE_IN + 8], [0, 1], { extrapolateRight: "clamp" });

  // Continuous float after hold
  const floatOffset = frame >= P7_HOLD_START
    ? Math.sin(((frame - P7_HOLD_START) / fps) * Math.PI * 0.6) * 14
    : 0;

  // ── Phase 4: Hook slides up ───────────────────────────────────────────────
  const hookSpring  = spring({ fps, frame: frame - P4_HOOK_IN, config: { damping: 16, stiffness: 180 } });
  const hookY       = interpolate(hookSpring, [0, 1], [40, 0]);
  const hookOpacity = interpolate(frame, [P4_HOOK_IN, P4_HOOK_IN + 14], [0, 1], { extrapolateRight: "clamp" });

  // ── Phase 5: Subtext word-by-word ─────────────────────────────────────────
  const words = (subtext ?? "").split(" ");
  const subContainerOpacity = interpolate(
    frame,
    [P5_WORDS_IN, P5_WORDS_IN + 6],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // ── Phase 6: CTA bounce in ────────────────────────────────────────────────
  const ctaSpring  = spring({ fps, frame: frame - P6_CTA_IN, config: { damping: 8, stiffness: 300 } });
  const ctaScale   = interpolate(ctaSpring, [0, 1], [0.5, 1.0]);
  const ctaOpacity = interpolate(frame, [P6_CTA_IN, P6_CTA_IN + 10], [0, 1], { extrapolateRight: "clamp" });

  // Pulse on CTA after it settles
  const pulseBase  = Math.max(0, frame - (P6_CTA_IN + 30));
  const pulseCycle = pulseBase % (fps * 2.0);
  const ctaPulse   = interpolate(pulseCycle, [0, fps * 0.25, fps * 0.5, fps * 2.0], [1, 1.05, 1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Brand tag
  const brandOpacity = interpolate(frame, [P1_BRAND_IN, P1_BRAND_IN + 14], [0, 1], { extrapolateRight: "clamp" });
  const brandX       = interpolate(frame, [P1_BRAND_IN, P1_BRAND_IN + 14], [-20, 0], { extrapolateRight: "clamp" });

  // Decorative circles
  const circle1Scale = spring({ fps, frame: frame - P3_IMAGE_IN - 4, config: { damping: 20, stiffness: 140 } });
  const circle2Scale = spring({ fps, frame: frame - P3_IMAGE_IN - 10, config: { damping: 20, stiffness: 120 } });

  return (
    <AbsoluteFill style={{ opacity: globalOpacity, fontFamily, overflow: "hidden", background: "#000000" }}>

      {/* Phase 2 — Colour panel floods from bottom */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        height: bgHeight,
        background: `linear-gradient(160deg, ${primaryColor} 0%, ${accentColor}22 100%)`,
      }} />

      {/* Radial glow behind product */}
      <div style={{
        position: "absolute",
        top: "18%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 820, height: 820,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${accentColor}28 0%, transparent 68%)`,
        opacity: imageOpacity,
      }} />

      {/* Decorative ring 1 */}
      <div style={{
        position: "absolute", top: "28%", left: "50%",
        width: 560, height: 560, borderRadius: "50%",
        border: `2px solid ${accentColor}30`,
        transform: `translate(-50%, -50%) scale(${circle1Scale})`,
        opacity: 0.6,
      }} />
      {/* Decorative ring 2 */}
      <div style={{
        position: "absolute", top: "28%", left: "50%",
        width: 700, height: 700, borderRadius: "50%",
        border: `1.5px solid ${accentColor}18`,
        transform: `translate(-50%, -50%) scale(${circle2Scale})`,
        opacity: 0.4,
      }} />

      {/* Brand tag — top left */}
      <div style={{
        position: "absolute", top: 60, left: 60,
        opacity: brandOpacity,
        transform: `translateX(${brandX}px)`,
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.22)",
        borderRadius: 100,
        padding: "10px 24px",
      }}>
        <span style={{
          fontSize: 18, fontWeight: 700, letterSpacing: 5,
          textTransform: "uppercase", color: "#ffffff",
        }}>
          {brandName}
        </span>
      </div>

      {/* Phase 3 — Product image SLAM */}
      <div style={{
        position: "absolute",
        top: "6%", bottom: "44%",
        left: "6%", right: "6%",
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${imageScale}) translateY(${floatOffset}px)`,
        opacity: imageOpacity,
      }}>
        <Img
          src={imageUrl}
          style={{
            width: "100%", height: "100%",
            objectFit: "contain",
            filter: `drop-shadow(0 50px 100px ${accentColor}44)`,
          }}
        />
      </div>

      {/* Accent bar above headline */}
      <div style={{
        position: "absolute", bottom: 316, left: 56,
        width: interpolate(frame, [P4_HOOK_IN, P4_HOOK_IN + 35], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        height: 3, background: accentColor, borderRadius: 2,
        boxShadow: `0 0 12px ${accentColor}`,
      }} />

      {/* Phase 4 — Hook headline */}
      <div style={{
        position: "absolute", bottom: 240, left: 56, right: 56,
        opacity: hookOpacity,
        transform: `translateY(${hookY}px)`,
      }}>
        <p style={{
          fontSize: 76, fontWeight: 900, color: "#ffffff",
          lineHeight: 1.0, letterSpacing: -1.5, margin: 0,
          textShadow: `0 4px 0 ${accentColor}55`,
        }}>
          {headline}
        </p>
      </div>

      {/* Phase 5 — Subtext word-by-word */}
      <div style={{
        position: "absolute", bottom: 180, left: 56, right: 56,
        opacity: subContainerOpacity,
        display: "flex", flexWrap: "wrap", gap: "0.22em",
      }}>
        {words.map((word, i) => {
          const wOpacity = interpolate(
            frame,
            [P5_WORDS_IN + i * 4, P5_WORDS_IN + i * 4 + 12],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          const wY = interpolate(
            frame,
            [P5_WORDS_IN + i * 4, P5_WORDS_IN + i * 4 + 12],
            [12, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return (
            <span key={i} style={{
              display: "inline-block",
              fontSize: 38, fontWeight: 400,
              color: "rgba(255,255,255,0.72)",
              opacity: wOpacity,
              transform: `translateY(${wY}px)`,
            }}>
              {word}
            </span>
          );
        })}
      </div>

      {/* Phase 6 — CTA */}
      <div style={{
        position: "absolute", bottom: 88, left: 56,
        opacity: ctaOpacity,
        transform: `scale(${ctaScale * ctaPulse})`,
        transformOrigin: "left center",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 14,
          background: accentColor, color: "#ffffff",
          fontSize: 32, fontWeight: 700,
          padding: "22px 60px",
          borderRadius: 100,
          letterSpacing: 0.3,
          boxShadow: `0 20px 60px ${accentColor}66, 0 4px 0 ${accentColor}aa`,
        }}>
          {ctaText}
          <span style={{ fontSize: 24, opacity: 0.9 }}>→</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
