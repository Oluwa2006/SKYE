import {
  AbsoluteFill,
  Video,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  CalculateMetadataFunction,
} from "remotion";

// ─── Props ─────────────────────────────────────────────────────────────────────
// This composition plays any reference video exactly as-is, then overlays
// the swappable product image at the position + timing Gemini identified.
// Nothing else changes — audio, motion, text baked into the video all stay.

export interface AdVideoOverlayProps {
  backgroundVideoUrl: string;

  // The hero product image (placeholder for template, user's own image on render)
  imageUrl: string;

  // Product position as % of frame dimensions (from Gemini analysis)
  imageX:      number;  // left edge   0–100
  imageY:      number;  // top edge    0–100
  imageWidth:  number;  // width       0–100
  imageHeight: number;  // height      0–100

  // Timing (seconds)
  imageStartSec: number;  // when the overlay appears
  imageEndSec:   number;  // when it disappears — 0 means "until the end"

  // Entrance animation
  imageEntrance: "scale" | "fade" | "slide_up" | "slide_right" | "none";

  // Total video duration — drives calculateMetadata
  durationSec: number;
}

// ─── Dynamic duration — matches the reference video exactly ───────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const calculateMetadata: CalculateMetadataFunction<any> = ({
  props,
}) => {
  const fps = 30;
  const durationSec = typeof props.durationSec === "number" && props.durationSec > 0
    ? props.durationSec
    : 15;
  return {
    durationInFrames: Math.round(durationSec * fps),
    fps,
    width:  1080,
    height: 1920,
  };
};

// ─── Composition ───────────────────────────────────────────────────────────────
export const AdVideoOverlay: React.FC<AdVideoOverlayProps> = ({
  backgroundVideoUrl,
  imageUrl,
  imageX      = 10,
  imageY      = 15,
  imageWidth  = 80,
  imageHeight = 55,
  imageStartSec = 0,
  imageEndSec   = 0,
  imageEntrance = "scale",
  durationSec   = 15,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const startFrame = Math.round(imageStartSec * fps);
  const endFrame   = imageEndSec > 0
    ? Math.round(imageEndSec * fps)
    : durationInFrames;

  // ── Entrance spring ──────────────────────────────────────────────────────
  const elapsed  = Math.max(0, frame - startFrame);
  const progress = spring({ fps, frame: elapsed, config: { damping: 16, stiffness: 180 } });

  // Visibility window
  const visible = frame >= startFrame && frame < endFrame;

  let overlayOpacity = visible ? 1 : 0;
  let transform      = "none";

  if (visible) {
    switch (imageEntrance) {
      case "scale": {
        const scale = interpolate(progress, [0, 1], [0.72, 1.0]);
        overlayOpacity = interpolate(frame, [startFrame, startFrame + 10], [0, 1], { extrapolateRight: "clamp" });
        transform = `scale(${scale})`;
        break;
      }
      case "fade": {
        overlayOpacity = interpolate(frame, [startFrame, startFrame + 22], [0, 1], { extrapolateRight: "clamp" });
        break;
      }
      case "slide_up": {
        const y = interpolate(progress, [0, 1], [80, 0]);
        overlayOpacity = interpolate(frame, [startFrame, startFrame + 14], [0, 1], { extrapolateRight: "clamp" });
        transform = `translateY(${y}px)`;
        break;
      }
      case "slide_right": {
        const x = interpolate(progress, [0, 1], [-100, 0]);
        overlayOpacity = interpolate(frame, [startFrame, startFrame + 14], [0, 1], { extrapolateRight: "clamp" });
        transform = `translateX(${x}px)`;
        break;
      }
      case "none":
      default:
        overlayOpacity = 1;
    }

    // Fade out near the end window
    if (imageEndSec > 0) {
      overlayOpacity *= interpolate(
        frame,
        [endFrame - 14, endFrame],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
    }
  }

  // Suppress unused variable warning
  void durationSec;

  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#000" }}>

      {/* ── Reference video — plays exactly as-is ── */}
      {backgroundVideoUrl ? (
        <Video
          src={backgroundVideoUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        // Fallback while video URL is loading / empty
        <AbsoluteFill style={{ background: "#111" }} />
      )}

      {/* ── Hero product overlay ── */}
      {imageUrl ? (
        <div
          style={{
            position:  "absolute",
            left:      `${imageX}%`,
            top:       `${imageY}%`,
            width:     `${imageWidth}%`,
            height:    `${imageHeight}%`,
            opacity:   overlayOpacity,
            transform,
            transformOrigin: "center center",
          }}
        >
          <Img
            src={imageUrl}
            style={{
              width:  "100%",
              height: "100%",
              objectFit: "contain",
              filter: "drop-shadow(0 20px 60px rgba(0,0,0,0.35))",
            }}
          />
        </div>
      ) : null}

    </AbsoluteFill>
  );
};
