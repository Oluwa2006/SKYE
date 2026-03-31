import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export interface StatsDropProps {
  stats: { value: string; label: string }[];
  headline: string;
  brandName: string;
  primaryColor: string;
  accentColor: string;
}

export const StatsDrop: React.FC<StatsDropProps> = ({
  stats, headline, brandName, primaryColor, accentColor,
}) => {
  const frame = useCurrentFrame();

  const headlineOp = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const headlineY  = interpolate(frame, [0, 18], [-30, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: `linear-gradient(145deg, #0a0a0a 0%, ${primaryColor}22 100%)`, fontFamily: "sans-serif" }}>
      {/* Brand */}
      <div style={{ position: "absolute", top: 48, left: 54, color: "rgba(255,255,255,0.5)", fontSize: 20, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase" }}>
        {brandName}
      </div>

      {/* Headline */}
      <div style={{ position: "absolute", top: 140, left: 54, right: 54, opacity: headlineOp, transform: `translateY(${headlineY}px)`, fontSize: 40, fontWeight: 700, color: "rgba(255,255,255,0.6)", lineHeight: 1.3 }}>
        {headline}
      </div>

      {/* Stats grid */}
      <div style={{ position: "absolute", top: "50%", left: 54, right: 54, transform: "translateY(-50%)", display: "grid", gridTemplateColumns: stats.length > 2 ? "1fr 1fr" : "1fr 1fr", gap: 32 }}>
        {stats.map((stat, i) => {
          const delay = 20 + i * 18;
          const statOp = interpolate(frame, [delay, delay + 16], [0, 1], { extrapolateRight: "clamp" });
          const statY  = interpolate(frame, [delay, delay + 16], [40, 0], { extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ opacity: statOp, transform: `translateY(${statY}px)`, padding: "36px 40px", borderRadius: 20, background: "rgba(255,255,255,0.06)", border: `1px solid rgba(255,255,255,0.1)`, backdropFilter: "blur(10px)" }}>
              <div style={{ fontSize: 72, fontWeight: 900, color: "#fff", lineHeight: 1, marginBottom: 12, background: `linear-gradient(135deg, #fff, ${accentColor})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 24, color: "rgba(255,255,255,0.5)", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
