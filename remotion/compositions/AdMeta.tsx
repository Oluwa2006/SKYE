// ─── AdMeta — universal ad renderer ──────────────────────────────────────────
// Reads an AdSchema JSON and renders every layer using Remotion primitives.
// This is the Plan B engine: Gemini observes → outputs schema → AdMeta renders.

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

import type {
  AdSchema,
  BackgroundLayer,
  ProductLayer,
  TextLayer,
  DecorativeLayer,
  LogoLayer,
  SpringPreset,
  TextEntrance,
} from "../../src/lib/ad-schema";
import { SPRING_PRESETS, LETTER_SPACING_MAP, LINE_HEIGHT_MAP } from "../../src/lib/ad-schema";
import { resolveFont } from "../fonts";

export interface AdMetaProps {
  schema: AdSchema;
}

// ── Dynamic dimensions from schema ────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const calculateMetadata: CalculateMetadataFunction<any> = ({ props }) => {
  const schema = props.schema as AdSchema | undefined;
  const fps    = 30;
  const dur    = typeof schema?.duration_sec === "number" && schema.duration_sec > 0
    ? schema.duration_sec : 15;
  const ar     = schema?.aspect_ratio ?? "9:16";
  const [w, h] = ar === "16:9" ? [1920, 1080] : ar === "1:1" ? [1080, 1080] : [1080, 1920];
  return { durationInFrames: Math.round(dur * fps), fps, width: w, height: h };
};

// ── Plain helpers (NOT hooks — safe to call after conditional returns) ─────────
function calcSpring(frame: number, fps: number, startSec: number, preset: SpringPreset): number {
  return spring({
    fps,
    frame: Math.max(0, frame - Math.round(startSec * fps)),
    config: SPRING_PRESETS[preset],
  });
}

function calcExitOp(frame: number, fps: number, exitStartSec: number | null, dur = 12): number {
  if (exitStartSec == null) return 1;
  const ef = Math.round(exitStartSec * fps);
  if (frame < ef) return 1;
  return interpolate(frame, [ef, ef + dur], [1, 0], { extrapolateRight: "clamp" });
}

// ── Background ─────────────────────────────────────────────────────────────────
const Background: React.FC<{ layer: BackgroundLayer }> = ({ layer }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const overlay = layer.overlay_color
    ? <AbsoluteFill style={{ background: layer.overlay_color, opacity: layer.overlay_opacity ?? 0.4, pointerEvents: "none" }} />
    : null;

  const grain = layer.texture === "film_grain" || layer.texture === "noise"
    ? (
      <AbsoluteFill style={{ pointerEvents: "none", opacity: 0.07, mixBlendMode: "overlay" as const }}>
        <svg width="100%" height="100%" style={{ display: "block" }}>
          <filter id="admeta-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#admeta-grain)" />
        </svg>
      </AbsoluteFill>
    )
    : null;

  if (layer.type === "solid") {
    return (
      <>
        <AbsoluteFill style={{ background: layer.color ?? "#000000" }} />
        {overlay}{grain}
      </>
    );
  }

  if (layer.type === "gradient" || layer.type === "animated_gradient") {
    const [c1, c2] = layer.gradient_colors ?? ["#000000", "#333333"];
    const DIR: Record<string, string> = {
      to_bottom: "to bottom", to_top: "to top", to_right: "to right", to_left: "to left",
      diagonal_down: "135deg", diagonal_up: "45deg",
    };
    const dir = DIR[layer.gradient_direction ?? "to_bottom"] ?? "to bottom";

    let bg: string;
    if (layer.type === "animated_gradient" && layer.gradient_animation_duration_sec) {
      // Gently shift the gradient stop positions to simulate animation
      const cycle = layer.gradient_animation_duration_sec * fps;
      const t = (frame % cycle) / cycle;
      const shift = Math.sin(t * Math.PI * 2) * 15;
      bg = `linear-gradient(${dir}, ${c1} ${50 - shift}%, ${c2} ${50 + shift}%)`;
    } else {
      bg = `linear-gradient(${dir}, ${c1}, ${c2})`;
    }
    return (
      <>
        <AbsoluteFill style={{ background: bg }} />
        {overlay}{grain}
      </>
    );
  }

  if (layer.type === "video" && layer.src_url) {
    return (
      <>
        <Video
          src={layer.src_url}
          startFrom={Math.round((layer.video_start_sec ?? 0) * fps)}
          playbackRate={layer.video_speed ?? 1}
          loop={layer.video_loop ?? false}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            filter: layer.blur_px ? `blur(${layer.blur_px}px)` : undefined,
          }}
        />
        {overlay}{grain}
      </>
    );
  }

  if (layer.type === "image" && layer.src_url) {
    let imgStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover" };
    if (layer.ken_burns) {
      const t = Math.min(frame / 450, 1); // slow over ~15s
      if (layer.ken_burns_direction === "zoom_in")
        imgStyle.transform = `scale(${interpolate(t, [0, 1], [1, 1.09])})`;
      else if (layer.ken_burns_direction === "zoom_out")
        imgStyle.transform = `scale(${interpolate(t, [0, 1], [1.09, 1])})`;
      else if (layer.ken_burns_direction === "pan_right")
        imgStyle.transform = `translateX(${interpolate(t, [0, 1], [0, -4])}%)`;
      else if (layer.ken_burns_direction === "pan_left")
        imgStyle.transform = `translateX(${interpolate(t, [0, 1], [0, 4])}%)`;
    }
    return (
      <>
        <AbsoluteFill style={{ overflow: "hidden", filter: layer.blur_px ? `blur(${layer.blur_px}px)` : undefined }}>
          <Img src={layer.src_url} style={imgStyle} />
        </AbsoluteFill>
        {overlay}{grain}
      </>
    );
  }

  return <AbsoluteFill style={{ background: "#111111" }} />;
};

// ── Smart product placeholder ──────────────────────────────────────────────────
// Shown when image_url is empty (template preview / admin mode).
// Renders an animated silhouette that matches the expected product shape.
const ProductPlaceholder: React.FC<{ layer: ProductLayer; frame: number; fps: number }> = ({ layer, frame, fps }) => {
  // Derive shape from background_shape hint or fall back to aspect ratio
  const bg = layer.background_shape;
  const isCircle = bg?.type === "circle";
  const isLandscape = layer.width_pct > layer.height_pct * 1.4;
  const isPortrait   = layer.height_pct > layer.width_pct * 1.2;

  const borderRadius = isCircle       ? "50%"
                     : isLandscape    ? "14px"
                     : isPortrait     ? "18px"
                     : "20px"; // square/generic

  // Slow breathing pulse — 2s cycle
  const breathe   = Math.sin((frame / fps) * Math.PI) * 0.018;
  const pulseScale = 1 + breathe;

  // Shimmer sweep across the silhouette
  const shimmerX = ((frame / fps) % 2) / 2; // 0→1 over 2s, loops

  // Color: pull from drop_shadow_color or neutral
  const accent = layer.drop_shadow_color ?? layer.ambient_glow_color ?? "#a0b4cc";

  return (
    <div
      style={{
        width: "100%", height: "100%",
        borderRadius,
        overflow: "hidden",
        transform: `scale(${pulseScale})`,
        transformOrigin: "center center",
        position: "relative",
        background: `linear-gradient(135deg, ${accent}22 0%, ${accent}44 50%, ${accent}22 100%)`,
        border: `1.5px solid ${accent}55`,
      }}
    >
      {/* Shimmer band */}
      <div style={{
        position:    "absolute",
        inset:       0,
        background:  `linear-gradient(105deg, transparent ${shimmerX * 80}%, rgba(255,255,255,0.18) ${shimmerX * 80 + 15}%, transparent ${shimmerX * 80 + 30}%)`,
        pointerEvents: "none",
      }} />

      {/* Icon + label */}
      <div style={{
        position:       "absolute",
        inset:          0,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap:            "8px",
        padding:        "12px",
      }}>
        {/* Camera icon (SVG — no external import needed) */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.45 }}>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="1.5"/>
        </svg>
        <span style={{
          color:       "rgba(255,255,255,0.55)",
          fontSize:    11,
          fontFamily:  "sans-serif",
          fontWeight:  600,
          textAlign:   "center",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}>
          Drop product here
        </span>
      </div>
    </div>
  );
};

// ── Product ────────────────────────────────────────────────────────────────────
const ProductRenderer: React.FC<{
  layer:         ProductLayer;
  globalPreset:  SpringPreset;
  overrides:     Record<string, SpringPreset>;
}> = ({ layer, globalPreset, overrides }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const preset = overrides[layer.id] ?? globalPreset;
  const startFrame = Math.round(layer.entrance_start_sec * fps);
  const sp     = calcSpring(frame, fps, layer.entrance_start_sec, preset);
  const exitOp = calcExitOp(frame, fps, layer.exit_start_sec, 15);

  if (frame < startFrame) return null;

  const exitScale =
    layer.exit === "scale_down" && layer.exit_start_sec != null && frame >= Math.round(layer.exit_start_sec * fps)
      ? interpolate(frame, [Math.round(layer.exit_start_sec * fps), Math.round(layer.exit_start_sec * fps) + 15], [1, 0.7], { extrapolateRight: "clamp" })
      : 1;

  // Entrance
  let opacity = 1;
  let transform = `rotate(${layer.rotation_deg ?? 0}deg)`;
  const fade10 = (lo: number) => interpolate(frame, [startFrame, startFrame + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  switch (layer.entrance) {
    case "slam":
    case "scale": {
      const s = interpolate(sp, [0, 1], [layer.entrance === "slam" ? 0.4 : 0.72, 1]);
      opacity = fade10(startFrame);
      transform = `rotate(${layer.rotation_deg ?? 0}deg) scale(${s})`;
      break;
    }
    case "fade":
      opacity = interpolate(sp, [0, 1], [0, 1]);
      break;
    case "slide_up": {
      const y = interpolate(sp, [0, 1], [100, 0]);
      opacity = fade10(startFrame);
      transform = `rotate(${layer.rotation_deg ?? 0}deg) translateY(${y}px)`;
      break;
    }
    case "slide_right": {
      const x = interpolate(sp, [0, 1], [-160, 0]);
      opacity = fade10(startFrame);
      transform = `rotate(${layer.rotation_deg ?? 0}deg) translateX(${x}px)`;
      break;
    }
    default: break;
  }

  // Visible animation
  const postEntry = Math.max(0, frame - startFrame - 20);
  if (layer.visible_animation === "float") {
    const floatY = Math.sin((postEntry / fps) * Math.PI * 0.8) * 8;
    transform += ` translateY(${floatY}px)`;
  } else if (layer.visible_animation === "slow_zoom_in") {
    const z = 1 + (postEntry / durationInFrames) * 0.07;
    transform += ` scale(${z})`;
  } else if (layer.visible_animation === "slow_zoom_out") {
    const z = 1.07 - (postEntry / durationInFrames) * 0.07;
    transform += ` scale(${z})`;
  }

  const SHADOW: Record<string, string> = {
    none:    "none",
    soft:    "drop-shadow(0 10px 30px rgba(0,0,0,0.22))",
    medium:  "drop-shadow(0 20px 55px rgba(0,0,0,0.38))",
    strong:  "drop-shadow(0 28px 80px rgba(0,0,0,0.60))",
    colored: layer.drop_shadow_color
      ? `drop-shadow(0 20px 60px ${layer.drop_shadow_color}88)`
      : "drop-shadow(0 20px 55px rgba(0,0,0,0.40))",
  };

  const bg = layer.background_shape;

  return (
    <div
      style={{
        position: "absolute",
        left:    `${layer.x_pct}%`,
        top:     `${layer.y_pct}%`,
        width:   `${layer.width_pct}%`,
        height:  `${layer.height_pct}%`,
        opacity: opacity * exitOp,
        transform: `${transform} scale(${exitScale})`,
        transformOrigin: "center center",
      }}
    >
      {/* Ambient glow — soft colored aura behind the product */}
      {layer.ambient_glow && (() => {
        const glowColor = layer.ambient_glow_color ?? layer.drop_shadow_color ?? "#ffffff";
        const glowSize  = (layer.ambient_glow_size ?? 0.9) * 100;
        const offset    = (100 - glowSize) / 2;
        return (
          <div style={{
            position:     "absolute",
            width:        `${glowSize}%`,
            height:       `${glowSize}%`,
            left:         `${offset}%`,
            top:          `${offset}%`,
            borderRadius: "50%",
            background:   `radial-gradient(ellipse at center, ${glowColor}88 0%, ${glowColor}33 45%, transparent 72%)`,
            filter:       "blur(28px)",
            pointerEvents: "none",
          }} />
        );
      })()}

      {bg && (() => {
        const scale = bg.scale ?? 1.2;
        const br = bg.type === "circle"       ? "50%"
                 : bg.type === "blob"         ? "42% 58% 54% 46% / 48% 44% 56% 52%"
                 : bg.border_radius != null   ? `${bg.border_radius}%`
                 : bg.type === "rounded_rect" ? "16%"
                 : 0;
        return (
          <div
            style={{
              position: "absolute",
              width:  `${scale * 100}%`,
              height: `${scale * 100}%`,
              left:   `${50 - scale * 50}%`,
              top:    `${50 - scale * 50}%`,
              borderRadius: br,
              background: bg.blur_px
                ? `radial-gradient(ellipse at center, ${bg.color} 0%, transparent 70%)`
                : bg.color,
              opacity: bg.opacity,
              filter: bg.blur_px ? `blur(${bg.blur_px}px)` : undefined,
            }}
          />
        );
      })()}

      {layer.image_url ? (
        <>
          <Img
            src={layer.image_url}
            style={{
              position:  "absolute",
              width:     "100%",
              height:    "100%",
              objectFit: layer.object_fit ?? "contain",
              filter:    SHADOW[layer.drop_shadow] ?? SHADOW.medium,
            }}
          />

          {/* Tint overlay — color-grades the product to match the scene */}
          {layer.tint_color && (
            <div style={{
              position:     "absolute",
              inset:        0,
              background:   layer.tint_color,
              opacity:      layer.tint_opacity ?? 0.18,
              mixBlendMode: "multiply",
              pointerEvents: "none",
            }} />
          )}

          {/* Floor reflection — mirrored faded copy below the product */}
          {layer.floor_reflection && (
            <div style={{
              position:        "absolute",
              top:             "98%",
              left:            0,
              width:           "100%",
              height:          "45%",
              transform:       "scaleY(-1)",
              transformOrigin: "top center",
              maskImage:       "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)",
              opacity:         layer.floor_reflection_opacity ?? 0.25,
              pointerEvents:   "none",
              overflow:        "hidden",
            }}>
              <Img
                src={layer.image_url}
                style={{ width: "100%", height: "100%", objectFit: layer.object_fit ?? "contain" }}
              />
            </div>
          )}
        </>
      ) : (
        <ProductPlaceholder layer={layer} frame={frame} fps={fps} />
      )}
    </div>
  );
};

// ── Text helpers ───────────────────────────────────────────────────────────────
const WordByWord: React.FC<{
  words:       string[];
  startFrame:  number;
  staggerFr:   number;
  wordStyle:   React.CSSProperties;
}> = ({ words, startFrame, staggerFr, wordStyle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {words.map((word, i) => {
        const ws = startFrame + i * staggerFr;
        const sp = spring({ fps, frame: Math.max(0, frame - ws), config: SPRING_PRESETS.snappy });
        const op = interpolate(sp, [0, 1], [0, 1]);
        const y  = interpolate(sp, [0, 1], [18, 0]);
        const sc = interpolate(sp, [0, 1], [0.82, 1]);
        const bl = interpolate(sp, [0, 1], [4, 0]);
        return (
          <span key={i} style={{
            ...wordStyle,
            display:     "inline-block",
            opacity:     op,
            transform:   `translateY(${y}px) scale(${sc})`,
            filter:      `blur(${bl}px)`,
            marginRight: "0.22em",
          }}>
            {word}
          </span>
        );
      })}
    </>
  );
};

const CharByChar: React.FC<{
  chars:      string[];
  startFrame: number;
  staggerFr:  number;
  charStyle:  React.CSSProperties;
}> = ({ chars, startFrame, staggerFr, charStyle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {chars.map((ch, i) => {
        const cs = startFrame + i * staggerFr;
        const sp = spring({ fps, frame: Math.max(0, frame - cs), config: SPRING_PRESETS.snappy });
        return (
          <span key={i} style={{
            ...charStyle,
            display:   "inline-block",
            opacity:   interpolate(sp, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(sp, [0, 1], [10, 0])}px)`,
          }}>
            {ch === " " ? "\u00A0" : ch}
          </span>
        );
      })}
    </>
  );
};

// ── Text renderer ──────────────────────────────────────────────────────────────
const TextRenderer: React.FC<{
  layer:        TextLayer;
  globalPreset: SpringPreset;
  overrides:    Record<string, SpringPreset>;
  frameWidth:   number;
}> = ({ layer, globalPreset, overrides, frameWidth }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const preset     = overrides[layer.id] ?? globalPreset;
  const startFrame = Math.round(layer.entrance_start_sec * fps);
  const sp         = calcSpring(frame, fps, layer.entrance_start_sec, preset);
  const exitOp     = calcExitOp(frame, fps, layer.exit_start_sec);

  if (frame < startFrame) return null;

  const fontPx  = (layer.font_size_vw / 100) * frameWidth;
  const staggerFr = layer.stagger_ms != null ? (layer.stagger_ms / 1000) * fps : 4;

  // Gradient fill — CSS gradient text trick
  const gf = layer.gradient_fill;
  const gradientTextStyle: React.CSSProperties = gf ? {
    background: `linear-gradient(${gf.direction === "to_right" ? "to right" : gf.direction === "diagonal" ? "135deg" : "to bottom"}, ${gf.colors[0]}, ${gf.colors[1]})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  } : {};

  const baseStyle: React.CSSProperties = {
    fontFamily:      `'${resolveFont(layer.font_family)}', sans-serif`,
    fontWeight:      layer.font_weight,
    fontSize:        fontPx,
    color:           gf ? "transparent" : layer.color,
    textTransform:   layer.text_transform !== "none" ? layer.text_transform as React.CSSProperties["textTransform"] : undefined,
    letterSpacing:   LETTER_SPACING_MAP[layer.letter_spacing],
    lineHeight:      LINE_HEIGHT_MAP[layer.line_height],
    textAlign:       layer.text_align,
    wordWrap:        "break-word",
    overflowWrap:    "break-word",
    display:         "block",
    textShadow:      layer.text_shadow
      ? `${layer.text_shadow.offset_x_px}px ${layer.text_shadow.offset_y_px}px ${layer.text_shadow.blur_px}px ${layer.text_shadow.color}`
      : undefined,
    WebkitTextStroke: layer.stroke ? `${layer.stroke.width_px}px ${layer.stroke.color}` : undefined,
    ...gradientTextStyle,
  };

  // Loop animation
  let loopStyle: React.CSSProperties = {};
  if (layer.loop_animation === "pulse") {
    loopStyle.transform = `scale(${1 + Math.sin((frame / fps) * Math.PI * 2) * 0.025})`;
  } else if (layer.loop_animation === "bounce") {
    loopStyle.transform = `translateY(${Math.sin((frame / fps) * Math.PI * 2) * 5}px)`;
  } else if (layer.loop_animation === "glow") {
    const g = Math.sin((frame / fps) * Math.PI * 2) * 0.5 + 0.5;
    loopStyle.textShadow = `0 0 ${16 + g * 20}px ${layer.color}`;
  }

  // ── Exit transform (slide_out) ───────────────────────────────────────────
  let exitTx = "";
  if (layer.exit === "slide_out" && layer.exit_start_sec != null) {
    const ef    = Math.round(layer.exit_start_sec * fps);
    const exitSp = spring({ fps, frame: Math.max(0, frame - ef), config: SPRING_PRESETS.snappy });
    exitTx = `translateY(${interpolate(exitSp, [0, 1], [0, -32])}px)`;
  }

  // ── Per-entrance ─────────────────────────────────────────────────────────
  let entranceOp           = 1;
  let entranceTx           = "";
  let entranceFilter       = "";
  let wrapperExtra: React.CSSProperties = {};
  let innerNode: React.ReactNode        = null;
  // line_reveal uses a special clip wrapper — set this flag to render differently
  let isLineReveal         = false;

  const entrance = layer.entrance as TextEntrance;

  switch (entrance) {
    case "fade_up": {
      entranceOp = interpolate(sp, [0, 1], [0, 1]);
      entranceTx = `translateY(${interpolate(sp, [0, 1], [28, 0])}px)`;
      break;
    }
    case "rise": {
      // Slow cinematic lift — softer than fade_up, wider Y range
      const riseSp = spring({ fps, frame: Math.max(0, frame - startFrame), config: SPRING_PRESETS.soft });
      entranceOp   = interpolate(riseSp, [0, 1], [0, 1]);
      entranceTx   = `translateY(${interpolate(riseSp, [0, 1], [48, 0])}px)`;
      break;
    }
    case "fade_in": {
      entranceOp = interpolate(sp, [0, 1], [0, 1]);
      break;
    }
    case "blur_in": {
      // Sharpens from blurred — cinematic focus-pull feel
      const blurSp  = spring({ fps, frame: Math.max(0, frame - startFrame), config: SPRING_PRESETS.soft });
      entranceOp    = interpolate(blurSp, [0, 0.4, 1], [0, 0.7, 1]);
      entranceFilter = `blur(${interpolate(blurSp, [0, 1], [10, 0])}px)`;
      break;
    }
    case "line_reveal": {
      // Text rises from behind an overflow:hidden clip — most professional ad standard
      isLineReveal = true;
      break;
    }
    case "slide_left": {
      entranceTx = `translateX(${interpolate(sp, [0, 1], [70, 0])}px)`;
      entranceOp = interpolate(frame, [startFrame, startFrame + 8], [0, 1], { extrapolateRight: "clamp" });
      break;
    }
    case "slide_right": {
      entranceTx = `translateX(${interpolate(sp, [0, 1], [-70, 0])}px)`;
      entranceOp = interpolate(frame, [startFrame, startFrame + 8], [0, 1], { extrapolateRight: "clamp" });
      break;
    }
    case "scale_punch": {
      // Fixed: use spring for proper overshoot, not linear interpolate
      const punchSp = spring({ fps, frame: Math.max(0, frame - startFrame), config: SPRING_PRESETS.bouncy });
      entranceTx    = `scale(${interpolate(punchSp, [0, 1], [1.5, 1])})`;
      entranceOp    = interpolate(frame, [startFrame, startFrame + 5], [0, 1], { extrapolateRight: "clamp" });
      break;
    }
    case "snap_in": {
      entranceTx = `translateY(${interpolate(sp, [0, 1], [-18, 0])}px)`;
      entranceOp = interpolate(frame, [startFrame, startFrame + 7], [0, 1], { extrapolateRight: "clamp" });
      break;
    }
    case "mask_wipe": {
      const clip = interpolate(sp, [0, 1], [100, 0]);
      wrapperExtra = { clipPath: `inset(0 ${clip}% 0 0)` };
      break;
    }
    case "word_by_word": {
      innerNode = (
        <WordByWord
          words={layer.content.split(" ")}
          startFrame={startFrame}
          staggerFr={staggerFr}
          wordStyle={baseStyle}
        />
      );
      break;
    }
    case "char_by_char": {
      innerNode = (
        <CharByChar
          chars={layer.content.split("")}
          startFrame={startFrame}
          staggerFr={staggerFr}
          charStyle={baseStyle}
        />
      );
      break;
    }
    default: break;
  }

  // ── Background pill — animates in slightly ahead of text ─────────────────
  const bg = layer.background;
  const pillStartSec = Math.max(0, layer.entrance_start_sec - 0.06);
  const pillSp       = spring({ fps, frame: Math.max(0, frame - Math.round(pillStartSec * fps)), config: SPRING_PRESETS.snappy });
  const bgStyle: React.CSSProperties = bg ? {
    background:     bg.color,
    backdropFilter: bg.backdrop_blur_px ? `blur(${bg.backdrop_blur_px}px)` : undefined,
    borderRadius:
      bg.border_radius === "pill"   ? 9999 :
      bg.border_radius === "large"  ? 20   :
      bg.border_radius === "medium" ? 12   :
      bg.border_radius === "small"  ? 6    : 0,
    paddingLeft:   `${bg.padding_x_vw}%`,
    paddingRight:  `${bg.padding_x_vw}%`,
    paddingTop:    `${bg.padding_y_vw}%`,
    paddingBottom: `${bg.padding_y_vw}%`,
    boxShadow:     bg.has_shadow && bg.shadow_color ? `0 8px 32px ${bg.shadow_color}55` : undefined,
    display:       "inline-block",
    // Pill scales in from center
    transform:     `scale(${interpolate(pillSp, [0, 1], [0.72, 1])})`,
    opacity:       interpolate(pillSp, [0, 1], [0, 1]),
  } : {};

  // ── line_reveal — special rendering ──────────────────────────────────────
  if (isLineReveal) {
    const lineY = interpolate(sp, [0, 1], [105, 0]);
    return (
      <div style={{
        position:        "absolute",
        left:            `${layer.x_pct}%`,
        top:             `${layer.y_pct}%`,
        width:           `${layer.width_pct}%`,
        opacity:         exitOp,
        transform:       exitTx,
        transformOrigin: "center center",
        ...loopStyle,
        overflow:        "hidden",
        paddingBottom:   "0.12em", // prevent descender clip
      }}>
        <div style={{ transform: `translateY(${lineY}%)` }}>
          <div style={bgStyle}>
            <span style={baseStyle}>{layer.content}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position:        "absolute",
        left:            `${layer.x_pct}%`,
        top:             `${layer.y_pct}%`,
        width:           `${layer.width_pct}%`,
        opacity:         entranceOp * exitOp,
        transform:       `${entranceTx} ${exitTx}`.trim(),
        filter:          entranceFilter || undefined,
        transformOrigin: "center center",
        ...loopStyle,
        ...wrapperExtra,
      }}
    >
      <div style={bgStyle}>
        {innerNode ?? <span style={baseStyle}>{layer.content}</span>}
      </div>
    </div>
  );
};

// ── Decorative renderer ────────────────────────────────────────────────────────
const DecorativeRenderer: React.FC<{
  layer:        DecorativeLayer;
  globalPreset: SpringPreset;
  overrides:    Record<string, SpringPreset>;
  frameWidth:   number;
}> = ({ layer, globalPreset, overrides, frameWidth }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const preset = overrides[layer.id] ?? globalPreset;
  const startFrame = Math.round(layer.entrance_start_sec * fps);
  const exitOp     = calcExitOp(frame, fps, layer.exit_start_sec);

  if (frame < startFrame) return null;

  const durFr   = Math.max(1, Math.round(layer.entrance_duration_sec * fps));
  const elapsed = Math.max(0, frame - startFrame);
  const linProg = Math.min(1, elapsed / durFr);
  const sp      = spring({ fps, frame: elapsed, config: SPRING_PRESETS[preset] });

  const fill   = layer.fill;
  const color1 = fill.type === "solid" ? fill.color : fill.colors[0];
  const color2 = fill.type === "solid" ? fill.color : fill.colors[1];
  const DIR: Record<string, string> = { to_bottom: "to bottom", to_right: "to right", diagonal: "135deg" };
  const gradientBg = fill.type === "gradient"
    ? `linear-gradient(${DIR[fill.direction] ?? "to bottom"}, ${color1}, ${color2})`
    : fill.color;

  const BR: Record<string, string | number> = { none: 0, small: 4, medium: 12, large: 24, full: "50%" };
  const br = BR[layer.border_radius ?? "none"] ?? 0;

  let wPct      = layer.width_pct;
  let hPct      = layer.height_pct;
  let entranceOp = 1;
  let tx         = `rotate(${layer.rotation_deg ?? 0}deg)`;

  switch (layer.entrance) {
    case "grow_width":  wPct = linProg * layer.width_pct;  break;
    case "grow_height": hPct = linProg * layer.height_pct; break;
    case "scale": {
      tx = `rotate(${layer.rotation_deg ?? 0}deg) scale(${interpolate(sp, [0, 1], [0, 1])})`;
      break;
    }
    case "fade":  entranceOp = interpolate(sp, [0, 1], [0, 1]); break;
    case "sweep": {
      tx = `rotate(${layer.rotation_deg ?? 0}deg) translateX(${interpolate(sp, [0, 1], [-frameWidth, 0])}px)`;
      break;
    }
    default: break;
  }

  const baseStyle: React.CSSProperties = {
    position:        "absolute",
    left:            `${layer.x_pct}%`,
    top:             `${layer.y_pct}%`,
    opacity:         layer.opacity * entranceOp * exitOp,
    transform:       tx,
    transformOrigin: "center center",
  };

  // ── Type-specific rendering ────────────────────────────────────────────────

  // Glow — radial gradient circle, no hard edges
  if (layer.type === "glow") {
    return (
      <div style={{
        ...baseStyle,
        width:  `${wPct}%`,
        height: `${hPct}%`,
        borderRadius: "50%",
        background: `radial-gradient(ellipse at center, ${color1}cc 0%, ${color1}44 40%, transparent 70%)`,
        filter: layer.blur_px ? `blur(${layer.blur_px}px)` : "blur(40px)",
      }} />
    );
  }

  // Accent line — thin horizontal rule, full width by default
  if (layer.type === "accent_line") {
    return (
      <div style={{
        ...baseStyle,
        width:    `${wPct}%`,
        height:   `${hPct}%`,
        background: gradientBg,
        borderRadius: 999,
      }} />
    );
  }

  // Sweep line — thin diagonal bar that crosses the frame
  if (layer.type === "sweep_line") {
    return (
      <div style={{
        ...baseStyle,
        width:  `${wPct}%`,
        height: `${Math.min(hPct, 0.4)}%`, // keep it thin
        background: gradientBg,
        opacity: layer.opacity * entranceOp * exitOp * 0.7,
      }} />
    );
  }

  // Circle ring — stroke outline only, centered
  if (layer.type === "circle_ring") {
    return (
      <div style={{
        ...baseStyle,
        width:        `${wPct}%`,
        height:       `${hPct}%`,
        borderRadius: "50%",
        background:   "transparent",
        border:       `${layer.stroke_width ?? 3}px solid ${color1}`,
        boxSizing:    "border-box",
      }} />
    );
  }

  // Dot pattern — CSS repeating-radial-gradient
  if (layer.type === "dot_pattern") {
    return (
      <div style={{
        ...baseStyle,
        width:  `${wPct}%`,
        height: `${hPct}%`,
        background: `radial-gradient(circle, ${color1} 1.5px, transparent 1.5px)`,
        backgroundSize: "18px 18px",
        opacity: layer.opacity * entranceOp * exitOp * 0.5,
      }} />
    );
  }

  // Color flood — full-bleed tinted overlay
  if (layer.type === "color_flood") {
    return (
      <div style={{
        ...baseStyle,
        width:      `${wPct}%`,
        height:     `${hPct}%`,
        background: gradientBg,
        borderRadius: br,
      }} />
    );
  }

  // Shape / default — solid or gradient fill with optional stroke
  return (
    <div
      style={{
        ...baseStyle,
        width:      `${wPct}%`,
        height:     `${hPct}%`,
        background: layer.stroke_only ? "transparent" : gradientBg,
        border:     layer.stroke_only
          ? `${layer.stroke_width ?? 2}px solid ${color1}`
          : undefined,
        borderRadius: br,
        filter:     layer.blur_px ? `blur(${layer.blur_px}px)` : undefined,
      }}
    />
  );
};

// ── Logo ───────────────────────────────────────────────────────────────────────
const LogoRenderer: React.FC<{ layer: LogoLayer }> = ({ layer }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = Math.round(layer.entrance_start_sec * fps);
  const exitOp     = calcExitOp(frame, fps, layer.exit_start_sec);

  if (frame < startFrame || !layer.image_url) return null;

  const sp = spring({ fps, frame: Math.max(0, frame - startFrame), config: SPRING_PRESETS.soft });

  let opacity = layer.opacity;
  let tx = "";

  switch (layer.entrance) {
    case "fade_in":  opacity *= interpolate(sp, [0, 1], [0, 1]); break;
    case "scale_in": {
      opacity *= interpolate(sp, [0, 1], [0, 1]);
      tx = `scale(${interpolate(sp, [0, 1], [0.55, 1])})`;
      break;
    }
    case "slide_in": {
      opacity *= interpolate(frame, [startFrame, startFrame + 10], [0, 1], { extrapolateRight: "clamp" });
      tx = `translateX(${interpolate(sp, [0, 1], [-40, 0])}px)`;
      break;
    }
    default: break;
  }

  return (
    <div
      style={{
        position: "absolute",
        left:   `${layer.x_pct}%`,
        top:    `${layer.y_pct}%`,
        width:  `${layer.width_pct}%`,
        height: `${layer.height_pct}%`,
        opacity: opacity * exitOp,
        transform: tx,
        transformOrigin: "center center",
      }}
    >
      <Img src={layer.image_url} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
};

// ── Root ───────────────────────────────────────────────────────────────────────
export const AdMeta: React.FC<AdMetaProps> = ({ schema }) => {
  const { width } = useVideoConfig();

  if (!schema) return <AbsoluteFill style={{ background: "#000" }} />;

  const globalPreset: SpringPreset = schema.motion?.spring_preset ?? "soft";
  const overrides = schema.motion?.layer_spring_overrides ?? {};

  const products   = schema.products    ?? [];
  const texts      = schema.text_layers ?? [];
  const decorative = schema.decorative  ?? [];

  // Split products by z-layer
  const bgProducts = products.filter(p => p.z_layer === "behind_all_text");
  const fgProducts = products.filter(p => p.z_layer !== "behind_all_text");

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* 1 ── Background */}
      <Background layer={schema.background} />

      {/* 2 ── Products behind all text */}
      {bgProducts.map(p => (
        <ProductRenderer key={p.id} layer={p} globalPreset={globalPreset} overrides={overrides} />
      ))}

      {/* 3 ── Decorative elements */}
      {decorative.map(d => (
        <DecorativeRenderer key={d.id} layer={d} globalPreset={globalPreset} overrides={overrides} frameWidth={width} />
      ))}

      {/* 4 ── Text layers */}
      {texts.map(t => (
        <TextRenderer key={t.id} layer={t} globalPreset={globalPreset} overrides={overrides} frameWidth={width} />
      ))}

      {/* 5 ── Products in front of / between text */}
      {fgProducts.map(p => (
        <ProductRenderer key={p.id} layer={p} globalPreset={globalPreset} overrides={overrides} />
      ))}

      {/* 6 ── Logo (always top) */}
      {schema.logo && <LogoRenderer layer={schema.logo} />}
    </AbsoluteFill>
  );
};
