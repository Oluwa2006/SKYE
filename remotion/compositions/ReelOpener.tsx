import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface ReelOpenerProps {
  brandName: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
}

export const ReelOpener: React.FC<ReelOpenerProps> = ({
  brandName, tagline, primaryColor, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lineW    = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  const nameOp   = interpolate(frame, [10, 24], [0, 1], { extrapolateRight: "clamp" });
  const nameX    = interpolate(frame, [10, 24], [-40, 0], { extrapolateRight: "clamp" });
  const tagOp    = interpolate(frame, [22, 34], [0, 1], { extrapolateRight: "clamp" });
  const dotScale = spring({ fps, frame: frame - 20, config: { damping: 10, stiffness: 300 } });

  return (
    <AbsoluteFill style={{ background: "#0a0a0a", fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Grid lines */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`, backgroundSize: "60px 60px" }} />

      {/* Accent line */}
      <div style={{ position: "absolute", left: 0, top: "50%", height: 3, background: `linear-gradient(90deg, ${accentColor}, ${primaryColor})`, width: `${lineW * 100}%`, transform: "translateY(-50%)" }} />

      {/* Center content */}
      <div style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
        {/* Dot */}
        <div style={{ width: 16, height: 16, borderRadius: "50%", background: accentColor, margin: "0 auto 28px", transform: `scale(${dotScale})`, boxShadow: `0 0 40px ${accentColor}` }} />

        {/* Brand name */}
        <div style={{ opacity: nameOp, transform: `translateX(${nameX}px)`, fontSize: 88, fontWeight: 900, color: "#ffffff", letterSpacing: -2, textTransform: "uppercase", lineHeight: 1 }}>
          {brandName}
        </div>

        {/* Tagline */}
        <div style={{ opacity: tagOp, fontSize: 26, color: "rgba(255,255,255,0.45)", letterSpacing: 6, textTransform: "uppercase", marginTop: 20, fontWeight: 400 }}>
          {tagline}
        </div>
      </div>
    </AbsoluteFill>
  );
};
