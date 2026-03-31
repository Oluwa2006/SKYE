import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Poppins";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "900"] });

export interface StoryCTAProps {
  headline: string;
  subtext: string;
  cta: string;
  brandName: string;
  primaryColor: string;
  accentColor: string;
}

export const StoryCTA: React.FC<StoryCTAProps> = ({
  headline, subtext, cta, brandName, primaryColor, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgScale  = interpolate(frame, [0, 90], [1.1, 1],   { extrapolateRight: "clamp" });
  const headOp   = interpolate(frame, [10, 28], [0, 1],    { extrapolateRight: "clamp" });
  const headY    = interpolate(frame, [10, 28], [50, 0],   { extrapolateRight: "clamp" });
  const subOp    = interpolate(frame, [26, 40], [0, 1],    { extrapolateRight: "clamp" });
  const ctaScale = spring({ fps, frame: frame - 40, config: { damping: 14, stiffness: 180 } });
  const arrowY   = interpolate(frame, [0, 30], [8, 0], { extrapolateRight: "clamp" });
  const arrowOp  = interpolate(frame, [55, 70], [0, 1],   { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ fontFamily, overflow: "hidden" }}>
      {/* Animated gradient bg */}
      <div style={{ position: "absolute", inset: 0, transform: `scale(${bgScale})`, background: `linear-gradient(160deg, ${primaryColor} 0%, ${accentColor} 55%, #12001a 100%)` }} />

      {/* Grain */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      {/* Brand */}
      <div style={{ position: "absolute", top: 64, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 24, fontWeight: 700, letterSpacing: 6, textTransform: "uppercase" }}>
        {brandName}
      </div>

      {/* Content */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 72px", textAlign: "center" }}>
        <div style={{ opacity: headOp, transform: `translateY(${headY}px)`, fontSize: 92, fontWeight: 900, color: "#fff", lineHeight: 1.0, marginBottom: 32, letterSpacing: -2 }}>
          {headline}
        </div>
        <div style={{ opacity: subOp, fontSize: 32, color: "rgba(255,255,255,0.7)", lineHeight: 1.55, marginBottom: 64, fontWeight: 400, maxWidth: 600 }}>
          {subtext}
        </div>
        <div style={{ transform: `scale(${ctaScale})`, background: "#fff", color: primaryColor, fontSize: 30, fontWeight: 900, padding: "24px 68px", borderRadius: 100, letterSpacing: 0.5, boxShadow: "0 12px 60px rgba(0,0,0,0.3)" }}>
          {cta}
        </div>
      </div>

      {/* Link in bio */}
      <div style={{ position: "absolute", bottom: 64, left: 0, right: 0, textAlign: "center", opacity: arrowOp }}>
        <div style={{ transform: `translateY(${arrowY}px)`, fontSize: 22, color: "rgba(255,255,255,0.5)", letterSpacing: 4, textTransform: "uppercase", marginBottom: 10 }}>Link in bio</div>
        <div style={{ transform: `translateY(${arrowY}px)`, fontSize: 36, color: "rgba(255,255,255,0.7)" }}>↑</div>
      </div>
    </AbsoluteFill>
  );
};
