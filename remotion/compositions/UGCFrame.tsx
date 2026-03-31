import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface UGCFrameProps {
  creatorHandle: string;
  caption: string;
  brandName: string;
  imageUrl?: string;
  primaryColor: string;
  accentColor: string;
}

export const UGCFrame: React.FC<UGCFrameProps> = ({
  creatorHandle, caption, brandName, imageUrl, primaryColor, accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const frameScale = spring({ fps, frame, config: { damping: 16, stiffness: 150 } });
  const badgeOp    = interpolate(frame, [14, 26], [0, 1], { extrapolateRight: "clamp" });
  const badgeY     = interpolate(frame, [14, 26], [20, 0], { extrapolateRight: "clamp" });
  const captionOp  = interpolate(frame, [24, 38], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#f9f9f9", fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Outer frame */}
      <div style={{ transform: `scale(${frameScale})`, width: 700, height: 840, borderRadius: 32, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.18)", position: "relative" }}>
        {/* Image/content area */}
        <div style={{ width: "100%", height: 640, background: imageUrl ? "transparent" : `linear-gradient(145deg, ${primaryColor}22, ${accentColor}33)`, position: "relative", overflow: "hidden" }}>
          {imageUrl && <img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          {!imageUrl && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 120, height: 120, borderRadius: "50%", background: `${accentColor}44` }} />
            </div>
          )}

          {/* Creator handle badge */}
          <div style={{ position: "absolute", top: 20, left: 20, opacity: badgeOp, transform: `translateY(${badgeY}px)` }}>
            <div style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px)", color: "#fff", padding: "10px 20px", borderRadius: 40, fontSize: 20, fontWeight: 700 }}>
              @{creatorHandle}
            </div>
          </div>

          {/* Brand corner tag */}
          <div style={{ position: "absolute", top: 20, right: 20 }}>
            <div style={{ background: accentColor, color: "#fff", padding: "8px 18px", borderRadius: 40, fontSize: 16, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
              {brandName}
            </div>
          </div>
        </div>

        {/* Caption bar */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 200, background: "#fff", padding: "24px 28px", borderTop: `4px solid ${accentColor}` }}>
          <div style={{ opacity: captionOp, fontSize: 22, color: "#1a1a2e", lineHeight: 1.5, fontWeight: 500 }}>
            {caption}
          </div>
          <div style={{ marginTop: 12, fontSize: 16, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: 2 }}>
            As seen on @{creatorHandle}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
