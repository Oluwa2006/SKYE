import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";

const { fontFamily } = loadFont("normal", { weights: ["700", "900"] });

export interface ProductSpotlightProps {
  headline: string;
  subtext: string;
  cta: string;
  brandName: string;
  imageUrl?: string;
  primaryColor: string;
  accentColor: string;
}

export const ProductSpotlight: React.FC<ProductSpotlightProps> = ({
  headline, subtext, cta, brandName, imageUrl, primaryColor, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgY       = interpolate(frame, [0, 22], [100, 0], { extrapolateRight: "clamp" });
  const imgOpacity = interpolate(frame, [0, 20], [0, 1],   { extrapolateRight: "clamp" });
  const headOp     = interpolate(frame, [24, 38], [0, 1],  { extrapolateRight: "clamp" });
  const headY      = interpolate(frame, [24, 38], [24, 0], { extrapolateRight: "clamp" });
  const subOp      = interpolate(frame, [34, 46], [0, 1],  { extrapolateRight: "clamp" });
  const ctaScale   = spring({ fps, frame: frame - 46, config: { damping: 12, stiffness: 180 } });

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${primaryColor} 0%, #08080f 100%)`, fontFamily }}>
      {/* Brand */}
      <div style={{ position: "absolute", top: 60, left: 64, color: "rgba(255,255,255,0.55)", fontSize: 26, fontWeight: 700, letterSpacing: 5, textTransform: "uppercase" }}>
        {brandName}
      </div>

      {/* Accent circle glow */}
      <div style={{ position: "absolute", top: "28%", left: "50%", transform: "translate(-50%,-50%)", width: 560, height: 560, borderRadius: "50%", background: `radial-gradient(circle, ${accentColor}30 0%, transparent 70%)`, pointerEvents: "none" }} />

      {/* Product image */}
      <div style={{ position: "absolute", top: "14%", left: "50%", transform: `translate(-50%, ${imgY}px)`, opacity: imgOpacity, width: 520, height: 520 }}>
        {imageUrl ? (
          <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 32, boxShadow: `0 40px 80px rgba(0,0,0,0.5)` }} />
        ) : (
          <div style={{ width: "100%", height: "100%", borderRadius: 32, background: `linear-gradient(135deg, ${accentColor}33, ${accentColor}11)`, border: `1.5px solid ${accentColor}44`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 40px 80px rgba(0,0,0,0.4)` }}>
            <div style={{ width: 140, height: 140, borderRadius: "50%", background: `${accentColor}33` }} />
          </div>
        )}
      </div>

      {/* Bottom gradient */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 480, background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 40%, transparent 100%)" }} />

      {/* Text */}
      <div style={{ position: "absolute", bottom: 140, left: 64, right: 64 }}>
        <div style={{ opacity: headOp, transform: `translateY(${headY}px)`, fontSize: 76, fontWeight: 900, color: "#fff", lineHeight: 1.05, marginBottom: 20, letterSpacing: -1 }}>
          {headline}
        </div>
        <div style={{ opacity: subOp, fontSize: 30, color: "rgba(255,255,255,0.6)", marginBottom: 44, fontWeight: 400, lineHeight: 1.5 }}>
          {subtext}
        </div>
        <div style={{ transform: `scale(${ctaScale})`, display: "inline-block", background: accentColor, color: "#fff", fontSize: 28, fontWeight: 900, padding: "20px 52px", borderRadius: 80, letterSpacing: 0.5, boxShadow: `0 8px 40px ${accentColor}66` }}>
          {cta}
        </div>
      </div>
    </AbsoluteFill>
  );
};
