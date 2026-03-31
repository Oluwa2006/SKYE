import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export interface BeforeAfterProps {
  beforeText: string;
  afterText: string;
  beforeLabel: string;
  afterLabel: string;
  brandName: string;
  primaryColor: string;
  accentColor: string;
}

export const BeforeAfter: React.FC<BeforeAfterProps> = ({
  beforeText, afterText, beforeLabel, afterLabel, brandName, primaryColor, accentColor,
}) => {
  const frame = useCurrentFrame();

  // Reveal: starts at left=50%, expands to left=0% over frames 20-50
  const dividerX = interpolate(frame, [20, 55], [50, 28], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOp  = interpolate(frame, [24, 38], [0, 1], { extrapolateRight: "clamp" });
  const textOp   = interpolate(frame, [30, 45], [0, 1], { extrapolateRight: "clamp" });
  const brandOp  = interpolate(frame, [50, 62], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ fontFamily: "sans-serif", overflow: "hidden" }}>
      {/* Before (right panel) */}
      <div style={{ position: "absolute", inset: 0, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 80px 0 0" }}>
        <div style={{ textAlign: "right", opacity: textOp }}>
          <div style={{ fontSize: 26, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>{beforeLabel}</div>
          <div style={{ fontSize: 52, fontWeight: 800, color: "#374151", lineHeight: 1.2 }}>{beforeText}</div>
        </div>
      </div>

      {/* After (left panel — clips to divider) */}
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${dividerX}%`, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(145deg, ${primaryColor}, ${accentColor})`, display: "flex", alignItems: "center", padding: "0 0 0 80px" }}>
          <div style={{ opacity: textOp }}>
            <div style={{ fontSize: 26, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>{afterLabel}</div>
            <div style={{ fontSize: 52, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{afterText}</div>
          </div>
        </div>
      </div>

      {/* Divider line */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${dividerX}%`, width: 4, background: "#fff", boxShadow: "0 0 20px rgba(255,255,255,0.8)", transform: "translateX(-2px)" }} />

      {/* Labels */}
      <div style={{ position: "absolute", top: 60, left: `${dividerX / 2}%`, transform: "translateX(-50%)", opacity: labelOp }}>
        <div style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", padding: "8px 20px", borderRadius: 40, fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>
          AFTER
        </div>
      </div>
      <div style={{ position: "absolute", top: 60, left: `${(100 + dividerX) / 2}%`, transform: "translateX(-50%)", opacity: labelOp }}>
        <div style={{ background: "rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.1)", color: "#374151", padding: "8px 20px", borderRadius: 40, fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>
          BEFORE
        </div>
      </div>

      {/* Brand watermark */}
      <div style={{ position: "absolute", bottom: 52, left: 0, right: 0, textAlign: "center", opacity: brandOp, color: "rgba(255,255,255,0.6)", fontSize: 18, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
        {brandName}
      </div>
    </AbsoluteFill>
  );
};
