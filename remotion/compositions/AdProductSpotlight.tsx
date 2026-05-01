import {
  AbsoluteFill, interpolate, spring, useCurrentFrame,
  useVideoConfig, Img,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "800", "900"] });

export interface AdProductSpotlightProps {
  imageUrl: string;
  headline: string;
  subtext?: string;
  ctaText: string;
  brandName: string;
  primaryColor?: string;
  accentColor?: string;
}

// Apple-style hero: clean bg, image zooms in, text layers fade/slide, CTA pulses
export const AdProductSpotlight: React.FC<AdProductSpotlightProps> = ({
  imageUrl,
  headline,
  subtext = "",
  ctaText,
  brandName,
  primaryColor = "#ffffff",
  accentColor  = "#1d4ed8",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Timing ─────────────────────────────────────────────────────────────────
  const BRAND_IN    = 8;
  const IMAGE_IN    = 20;
  const HOOK_IN     = fps * 1.4;
  const SUB_IN      = fps * 2.4;
  const CTA_IN      = fps * 3.6;
  const FADE_DUR    = 18;

  // Global fade
  const globalOpacity = interpolate(
    frame,
    [0, FADE_DUR, durationInFrames - FADE_DUR, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Brand name
  const brandOpacity = interpolate(frame, [BRAND_IN, BRAND_IN + 16], [0, 1], { extrapolateRight: "clamp" });
  const brandY       = interpolate(frame, [BRAND_IN, BRAND_IN + 16], [-10, 0], { extrapolateRight: "clamp" });

  // Product image — spring zoom from slightly smaller
  const imageScale   = spring({ fps, frame: frame - IMAGE_IN, config: { damping: 18, stiffness: 120 } });
  const imageFinal   = interpolate(imageScale, [0, 1], [0.82, 1.0]);
  const imageOpacity = interpolate(frame, [IMAGE_IN, IMAGE_IN + 22], [0, 1], { extrapolateRight: "clamp" });
  // Slow continuous Ken Burns push after the spring settles
  const kenBurns     = interpolate(frame, [IMAGE_IN + 40, durationInFrames], [1.0, 1.06], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Headline — slides up
  const hookSpring   = spring({ fps, frame: frame - HOOK_IN, config: { damping: 20, stiffness: 160 } });
  const hookY        = interpolate(hookSpring, [0, 1], [32, 0]);
  const hookOpacity  = interpolate(frame, [HOOK_IN, HOOK_IN + 14], [0, 1], { extrapolateRight: "clamp" });

  // Subtext
  const subOpacity   = interpolate(frame, [SUB_IN, SUB_IN + 18], [0, 1], { extrapolateRight: "clamp" });
  const subY         = interpolate(frame, [SUB_IN, SUB_IN + 18], [16, 0], { extrapolateRight: "clamp" });

  // CTA — spring bounce + pulse
  const ctaSpring    = spring({ fps, frame: frame - CTA_IN, config: { damping: 11, stiffness: 220 } });
  const ctaScale     = interpolate(ctaSpring, [0, 1], [0.7, 1.0]);
  const ctaOpacity   = interpolate(frame, [CTA_IN, CTA_IN + 12], [0, 1], { extrapolateRight: "clamp" });
  // Subtle recurring pulse after CTA appears
  const pulseFrame   = Math.max(0, frame - (CTA_IN + 20));
  const pulseCycle   = pulseFrame % (fps * 1.6);
  const ctaPulse     = interpolate(pulseCycle, [0, fps * 0.2, fps * 0.4, fps * 1.6], [1, 1.04, 1, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const isDark = primaryColor === "#000000" || primaryColor === "#111111" || primaryColor === "#0f172a";
  const textColor = isDark ? "#ffffff" : "#0f172a";
  const subtextColor = isDark ? "rgba(255,255,255,0.65)" : "rgba(15,23,42,0.55)";

  return (
    <AbsoluteFill
      style={{
        opacity: globalOpacity,
        fontFamily,
        overflow: "hidden",
        background: primaryColor,
      }}
    >
      {/* Subtle top-left radial glow */}
      <div style={{
        position: "absolute", top: -200, left: -200,
        width: 700, height: 700, borderRadius: "50%",
        background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Brand name — top center */}
      <div style={{
        position: "absolute", top: 72, left: 0, right: 0,
        textAlign: "center",
        opacity: brandOpacity,
        transform: `translateY(${brandY}px)`,
      }}>
        <span style={{
          fontSize: 18, fontWeight: 600, letterSpacing: 8,
          textTransform: "uppercase", color: textColor, opacity: 0.5,
        }}>
          {brandName}
        </span>
      </div>

      {/* Product image — centred hero */}
      <div style={{
        position: "absolute",
        top: "12%", bottom: "34%",
        left: "8%", right: "8%",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: imageOpacity,
        transform: `scale(${imageFinal * kenBurns})`,
      }}>
        <Img
          src={imageUrl}
          style={{
            width: "100%", height: "100%",
            objectFit: "contain",
            filter: "drop-shadow(0 40px 80px rgba(0,0,0,0.22))",
          }}
        />
      </div>

      {/* Thin accent line above text block */}
      <div style={{
        position: "absolute", bottom: 290, left: "8%",
        width: `${interpolate(frame, [HOOK_IN, HOOK_IN + 40], [0, 84 * 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
        height: 2, background: accentColor, borderRadius: 2, opacity: 0.6,
      }} />

      {/* Headline */}
      <div style={{
        position: "absolute", bottom: 220, left: "8%", right: "8%",
        opacity: hookOpacity,
        transform: `translateY(${hookY}px)`,
      }}>
        <p style={{
          fontSize: 72, fontWeight: 900, color: textColor,
          lineHeight: 1.05, letterSpacing: -1.5,
          margin: 0,
        }}>
          {headline}
        </p>
      </div>

      {/* Subtext */}
      {subtext ? (
        <div style={{
          position: "absolute", bottom: 168, left: "8%", right: "8%",
          opacity: subOpacity,
          transform: `translateY(${subY}px)`,
        }}>
          <p style={{
            fontSize: 34, fontWeight: 400, color: subtextColor,
            lineHeight: 1.35, margin: 0, letterSpacing: 0.2,
          }}>
            {subtext}
          </p>
        </div>
      ) : null}

      {/* CTA button */}
      <div style={{
        position: "absolute", bottom: 88, left: "8%",
        opacity: ctaOpacity,
        transform: `scale(${ctaScale * ctaPulse})`,
        transformOrigin: "left center",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 12,
          background: accentColor, color: "#ffffff",
          fontSize: 30, fontWeight: 700,
          padding: "20px 56px",
          borderRadius: 100,
          letterSpacing: 0.3,
          boxShadow: `0 16px 48px ${accentColor}55`,
        }}>
          {ctaText}
          <span style={{ fontSize: 22, opacity: 0.85 }}>→</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
