import {
  AbsoluteFill, Img, interpolate, spring, useCurrentFrame,
  useVideoConfig, staticFile, Sequence,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";

const { fontFamily } = loadFont("normal", { weights: ["500", "700", "900"] });

export interface AdProductImagesProps {
  images: string[];          // up to 4 product image URLs
  hook: string;
  subtext?: string;
  cta: string;
  brandName: string;
  primaryColor?: string;
  accentColor?: string;
  styleCategory?: string;    // cinematic | lifestyle | product | energetic | text-forward
}

// Ken Burns effect per image slot — each image gets a different movement
const KEN_BURNS = [
  { fromScale: 1.08, toScale: 1.18, fromX: 0,    toX: -20,  fromY: 0,   toY: -15  }, // zoom in + drift left-up
  { fromScale: 1.12, toScale: 1.0,  fromX: 20,   toX: 0,    fromY: 0,   toY: 10   }, // zoom out + drift right-down
  { fromScale: 1.0,  toScale: 1.12, fromX: -15,  toX: 15,   fromY: 10,  toY: -10  }, // zoom in + pan right
  { fromScale: 1.1,  toScale: 1.02, fromX: 0,    toX: -10,  fromY: -10, toY: 5    }, // subtle zoom out
];

function KenBurnsImage({
  src,
  slotIndex,
  startFrame,
  durationFrames,
}: {
  src: string;
  slotIndex: number;
  startFrame: number;
  durationFrames: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const kb = KEN_BURNS[slotIndex % KEN_BURNS.length];

  const localFrame = Math.max(0, frame - startFrame);
  const progress   = Math.min(1, localFrame / durationFrames);

  // Fade in/out within this image's slot
  const fadeFrames = Math.min(fps * 0.4, durationFrames * 0.2);
  const opacity = interpolate(
    localFrame,
    [0, fadeFrames, durationFrames - fadeFrames, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const scale = interpolate(progress, [0, 1], [kb.fromScale, kb.toScale]);
  const tx    = interpolate(progress, [0, 1], [kb.fromX,    kb.toX]);
  const ty    = interpolate(progress, [0, 1], [kb.fromY,    kb.toY]);

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${tx}px, ${ty}px)`,
          transformOrigin: "center center",
        }}
      />
    </AbsoluteFill>
  );
}

export const AdProductImages: React.FC<AdProductImagesProps> = ({
  images,
  hook,
  cta,
  brandName,
  subtext        = "",
  primaryColor   = "#1d4ed8",
  accentColor    = "#60a5fa",
  styleCategory  = "product",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const validImages = (images ?? []).filter(Boolean).slice(0, 4);
  const imgCount    = Math.max(1, validImages.length);

  // Each image gets equal time
  const perImage   = Math.floor(durationInFrames / imgCount);

  // ── Text timing ──────────────────────────────────────────────────────
  const BADGE_IN   = 6;
  const HOOK_IN    = fps * 0.5;
  const HOOK_OUT   = fps * 5;
  const SUB_IN     = fps * 5.5;
  const SUB_OUT    = fps * 11;
  const BAR_IN     = SUB_IN + 8;
  const CTA_IN     = fps * 12;

  const globalFade = interpolate(
    frame,
    [0, 10, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Badge
  const badgeScale = spring({ fps, frame: frame - BADGE_IN, config: { damping: 14, stiffness: 200 } });

  // Hook
  const hookOpacity = interpolate(frame, [HOOK_IN, HOOK_IN + 14, HOOK_OUT, HOOK_OUT + 12], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hookY       = interpolate(frame, [HOOK_IN, HOOK_IN + 16], [24, 0], { extrapolateRight: "clamp" });

  // Subtext
  const subOpacity  = interpolate(frame, [SUB_IN, SUB_IN + 14, SUB_OUT, SUB_OUT + 12], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subY        = interpolate(frame, [SUB_IN, SUB_IN + 14], [16, 0], { extrapolateRight: "clamp" });

  // Accent bar
  const barWidth    = interpolate(frame, [BAR_IN, BAR_IN + 45], [0, 260], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // CTA
  const ctaScale    = spring({ fps, frame: frame - CTA_IN, config: { damping: 12, stiffness: 220 } });
  const ctaOpacity  = interpolate(frame, [CTA_IN, CTA_IN + 12], [0, 1], { extrapolateRight: "clamp" });

  // Style-based colors
  const STYLE_OVERRIDES: Record<string, { scrim: string; hookSize: number }> = {
    cinematic:    { scrim: "linear-gradient(to top, rgba(5,3,0,0.95) 0%, rgba(0,0,0,0.3) 50%, transparent 70%)", hookSize: 70 },
    lifestyle:    { scrim: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 70%)", hookSize: 64 },
    product:      { scrim: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.15) 55%, transparent 70%)", hookSize: 66 },
    energetic:    { scrim: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 45%, transparent 65%)", hookSize: 72 },
    "text-forward": { scrim: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.1) 75%)", hookSize: 62 },
  };
  const style = STYLE_OVERRIDES[styleCategory] ?? STYLE_OVERRIDES.product;

  return (
    <AbsoluteFill style={{ opacity: globalFade, fontFamily, overflow: "hidden", background: "#000" }}>

      {/* ── Image slideshow with Ken Burns ──────────────────────────── */}
      {validImages.map((src, i) => (
        <KenBurnsImage
          key={i}
          src={src}
          slotIndex={i}
          startFrame={i * perImage}
          durationFrames={perImage + (i < imgCount - 1 ? 10 : 0)} // slight overlap for crossfade
        />
      ))}

      {/* ── Bottom scrim ─────────────────────────────────────────────── */}
      <AbsoluteFill style={{ background: style.scrim }} />

      {/* ── Accent top bar ───────────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 5,
        background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`,
      }} />

      {/* ── Brand badge ──────────────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: 52, right: 52,
        transform: `scale(${badgeScale})`,
        transformOrigin: "right top",
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.22)",
        color: "#fff",
        fontSize: 18, fontWeight: 700, letterSpacing: 3,
        textTransform: "uppercase",
        padding: "12px 28px",
        borderRadius: 40,
      }}>
        {brandName}
      </div>

      {/* ── Hook ─────────────────────────────────────────────────────── */}
      <div style={{
        position: "absolute",
        bottom: subtext ? 300 : 220,
        left: 52, right: 52,
        opacity: hookOpacity,
        transform: `translateY(${hookY}px)`,
      }}>
        <div style={{
          fontSize: style.hookSize,
          fontWeight: 900,
          color: "#fff",
          lineHeight: 1.08,
          letterSpacing: -0.5,
          textShadow: "0 2px 32px rgba(0,0,0,0.7)",
        }}>
          {hook}
        </div>
      </div>

      {/* ── Subtext + accent bar ─────────────────────────────────────── */}
      {subtext ? (
        <div style={{
          position: "absolute",
          bottom: 240,
          left: 52, right: 52,
          opacity: subOpacity,
          transform: `translateY(${subY}px)`,
        }}>
          <div style={{
            fontSize: 36, fontWeight: 500,
            color: "rgba(255,255,255,0.85)",
            lineHeight: 1.35, letterSpacing: 0.2,
          }}>
            {subtext}
          </div>
          <div style={{
            width: barWidth, height: 3, borderRadius: 3, marginTop: 16,
            background: `linear-gradient(90deg, ${accentColor}, ${primaryColor})`,
            boxShadow: `0 0 14px ${accentColor}66`,
          }} />
        </div>
      ) : null}

      {/* ── CTA button ───────────────────────────────────────────────── */}
      <div style={{
        position: "absolute",
        bottom: 96,
        left: 52,
        opacity: ctaOpacity,
        transform: `scale(${ctaScale})`,
        transformOrigin: "left center",
      }}>
        <div style={{
          display: "inline-block",
          background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`,
          color: "#fff",
          fontSize: 28, fontWeight: 700,
          padding: "18px 56px",
          borderRadius: 64,
          letterSpacing: 0.5,
          boxShadow: `0 12px 40px ${primaryColor}55`,
        }}>
          {cta}
        </div>
      </div>

    </AbsoluteFill>
  );
};
