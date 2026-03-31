import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/BebasNeue";

const { fontFamily } = loadFont();

export interface LimitedOfferProps {
  offerText: string;
  subtext: string;
  cta: string;
  brandName: string;
  urgencyLabel: string;
  primaryColor: string;
  accentColor: string;
}

export const LimitedOffer: React.FC<LimitedOfferProps> = ({
  offerText, subtext, cta, brandName, urgencyLabel, primaryColor, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeScale = spring({ fps, frame,        config: { damping: 10, stiffness: 280 } });
  const offerScale = spring({ fps, frame: frame - 12, config: { damping: 14, stiffness: 160 } });
  const subOp  = interpolate(frame, [28, 42], [0, 1], { extrapolateRight: "clamp" });
  const ctaOp  = interpolate(frame, [42, 55], [0, 1], { extrapolateRight: "clamp" });
  const pulse  = interpolate(frame % 24, [0, 12, 24], [1, 1.04, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#080808", fontFamily, overflow: "hidden" }}>
      {/* Diagonal stripes */}
      <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(45deg, ${accentColor}08 0px, ${accentColor}08 1px, transparent 1px, transparent 40px)` }} />

      {/* Red glow from center */}
      <div style={{ position: "absolute", top: "45%", left: "50%", transform: "translate(-50%,-50%)", width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle, ${accentColor}25 0%, transparent 65%)`, pointerEvents: "none" }} />

      {/* Brand */}
      <div style={{ position: "absolute", top: 56, left: 64, color: "rgba(255,255,255,0.4)", fontSize: 28, letterSpacing: 6, textTransform: "uppercase" }}>
        {brandName}
      </div>

      {/* Urgency badge */}
      <div style={{ position: "absolute", top: 50, right: 64, transform: `scale(${badgeScale})`, background: accentColor, color: "#fff", fontSize: 26, padding: "12px 30px", borderRadius: 60, letterSpacing: 2, textTransform: "uppercase" }}>
        {urgencyLabel}
      </div>

      {/* Giant offer text */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, -50%) scale(${offerScale})`, textAlign: "center", width: "100%", lineHeight: 0.85 }}>
        <div style={{ fontSize: 200, color: "#fff", letterSpacing: -4, textShadow: `0 0 120px ${accentColor}70, 0 0 40px ${accentColor}40` }}>
          {offerText}
        </div>
      </div>

      {/* Bottom */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 320, background: "linear-gradient(to top, #080808, transparent)" }} />
      <div style={{ position: "absolute", bottom: 120, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ opacity: subOp, fontSize: 36, color: "rgba(255,255,255,0.5)", marginBottom: 36, letterSpacing: 1 }}>{subtext}</div>
        <div style={{ opacity: ctaOp, transform: `scale(${pulse})`, display: "inline-block", background: accentColor, color: "#fff", fontSize: 36, padding: "22px 64px", borderRadius: 80, letterSpacing: 2, boxShadow: `0 0 60px ${accentColor}60` }}>
          {cta}
        </div>
      </div>
    </AbsoluteFill>
  );
};
