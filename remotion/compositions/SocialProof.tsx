import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface SocialProofProps {
  quote: string;
  customerName: string;
  rating: number;
  brandName: string;
  primaryColor: string;
  accentColor: string;
}

export const SocialProof: React.FC<SocialProofProps> = ({
  quote, customerName, rating, brandName, primaryColor, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const quoteMarkScale = spring({ fps, frame, config: { damping: 14, stiffness: 200 } });
  const cardY   = interpolate(frame, [8, 28], [60, 0], { extrapolateRight: "clamp" });
  const cardOp  = interpolate(frame, [8, 28], [0, 1], { extrapolateRight: "clamp" });
  const nameOp  = interpolate(frame, [32, 46], [0, 1], { extrapolateRight: "clamp" });
  const starsOp = interpolate(frame, [38, 52], [0, 1], { extrapolateRight: "clamp" });

  const stars = Math.min(5, Math.max(1, Math.round(rating)));

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, #ffffff 0%, #f8f4ff 100%)`, fontFamily: "sans-serif" }}>
      {/* Brand accent bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})` }} />

      {/* Brand name */}
      <div style={{ position: "absolute", top: 48, left: 54, color: primaryColor, fontSize: 22, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
        {brandName}
      </div>

      {/* Quote mark */}
      <div style={{ position: "absolute", top: 140, left: 44, fontSize: 200, fontWeight: 900, color: accentColor, opacity: 0.12, lineHeight: 1, transform: `scale(${quoteMarkScale})`, transformOrigin: "top left" }}>
        "
      </div>

      {/* Quote card */}
      <div style={{ position: "absolute", top: "50%", left: 54, right: 54, transform: `translateY(calc(-50% + ${cardY}px))`, opacity: cardOp }}>
        <div style={{ fontSize: 48, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.35, marginBottom: 40 }}>
          "{quote}"
        </div>
      </div>

      {/* Stars */}
      <div style={{ position: "absolute", bottom: 180, left: 54, opacity: starsOp }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[...Array(stars)].map((_, i) => (
            <div key={i} style={{ fontSize: 40, color: "#f59e0b" }}>★</div>
          ))}
          {[...Array(5 - stars)].map((_, i) => (
            <div key={i} style={{ fontSize: 40, color: "#e5e7eb" }}>★</div>
          ))}
        </div>
      </div>

      {/* Customer name */}
      <div style={{ position: "absolute", bottom: 100, left: 54, opacity: nameOp, display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }} />
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#1a1a2e" }}>{customerName}</div>
          <div style={{ fontSize: 20, color: "#9ca3af", marginTop: 4 }}>Verified customer</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
