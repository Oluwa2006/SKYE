"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  UploadSimple, CircleNotch, DownloadSimple, CheckCircle,
  FilmSlate, Play, WarningCircle, Sparkle,
  VideoCamera, TrashSimple,
} from "@phosphor-icons/react";
import type { AdSchema } from "@/lib/ad-schema";
import { normalizeSchema } from "@/lib/normalize-schema";
import { useIsAdmin } from "../UserContext";
import ProductAngleSelector from "./ProductAngleSelector";

// ─── Template definitions ──────────────────────────────────────────────────────
// text_slots   — the exact fields this composition renders, with style hints
//                matching what the ad actually shows (char limits, tone, position)
// required_angle — which product angle the composition is built for
//                  when user uploads multiple angles we pick this one automatically
// preview_url  — rendered MP4 of the template (frozen thumb, plays on hover)
//                set by admin after rendering the placeholder version

type TextSlot = {
  key:         string;
  label:       string;
  maxChars:    number;
  hint:        string;       // shown under the input — tells user what works
  placeholder: string;       // example from the original ad
  multiline?:  boolean;
};

type ProductAngle = "front" | "three-quarter" | "top-down" | "detail" | "any";

// Position/timing config extracted by Gemini — drives AdVideoOverlay composition
type OverlayConfig = {
  x_pct:      number;    // left edge 0–100
  y_pct:      number;    // top edge  0–100
  width_pct:  number;
  height_pct: number;
  start_sec:  number;
  end_sec:    number | null;
  entrance:   "scale" | "fade" | "slide_up" | "slide_right" | "none";
};

// A template saved from a completed render (stored in ad_templates DB table)
type DbTemplate = {
  id:                   string;
  composition_id:       string;
  name:                 string;
  video_url:            string;
  duration:             string;
  accent_color:         string;
  bg_color:             string;
  description:          string | null;
  text_slots:           TextSlot[];
  required_angle:       ProductAngle;
  angle_hint:           string;
  // AdVideoOverlay fields
  background_video_url: string | null;
  overlay_config:       OverlayConfig | null;
  duration_sec:         number | null;
  // AdMeta field
  ad_schema:            AdSchema | null;
};

// Normalised shape for whichever template is currently active
type ActiveTemplate = {
  sourceId:             string;
  compositionId:        string;
  name:                 string;
  duration:             string;
  accent:               string;
  bg:                   string;
  text_slots:           TextSlot[];
  videoUrl:             string | null;
  angle_hint:           string;
  // AdVideoOverlay fields
  background_video_url: string | null;
  overlay_config:       OverlayConfig | null;
  duration_sec:         number | null;
  // AdMeta field
  ad_schema:            AdSchema | null;
};

type Template = {
  id:             string;
  name:           string;
  duration:       string;
  accent:         string;
  bg:             string;
  description:    string;
  preview_url:    string | null;   // MP4 — null until admin renders placeholder
  thumbnail_url:  string | null;   // first frame JPG — null until set
  required_angle: ProductAngle;
  angle_hint:     string;          // shown to user when uploading
  text_slots:     TextSlot[];
};

const TEMPLATES: Template[] = [
  {
    id:             "AdProductSpotlight",
    name:           "Product Spotlight",
    duration:       "15s",
    accent:         "#1d4ed8",
    bg:             "#eff6ff",
    description:    "Apple-style hero. Clean background, animated zoom-in, pulsing CTA.",
    preview_url:    null,
    thumbnail_url:  null,
    required_angle: "front",
    angle_hint:     "Straight-on front shot. Clean or white background preferred.",
    text_slots: [
      { key: "headline", label: "Headline",  maxChars: 24, hint: "3–5 words. Short and punchy.",          placeholder: "Crispy. Fresh. Yours." },
      { key: "subtext",  label: "Subtext",   maxChars: 52, hint: "One benefit sentence.",                 placeholder: "Order now and taste the difference." },
      { key: "ctaText",  label: "CTA",       maxChars: 16, hint: "Action + object. e.g. 'Order Now'",     placeholder: "Order Now" },
    ],
  },
  {
    id:             "AdBurgerSwap",
    name:           "The Swap",
    duration:       "30s",
    accent:         "#ea580c",
    bg:             "#fff7ed",
    description:    "Full 30-second pre-animated ad. Drop in any product image — everything else stays locked.",
    preview_url:    null,
    thumbnail_url:  null,
    required_angle: "three-quarter",
    angle_hint:     "3/4 angle shot. Product slightly turned, shows depth.",
    text_slots: [
      { key: "headline", label: "Main Hook",  maxChars: 32, hint: "Bold claim. 4–7 words. Creates desire or curiosity.", placeholder: "You've never had it like this." },
      { key: "subtext",  label: "Subtext",    maxChars: 52, hint: "Word-by-word reveal. Keep it one clean sentence.",    placeholder: "One experience changes everything." },
      { key: "ctaText",  label: "CTA",        maxChars: 16, hint: "Short action. Matches the energy of the headline.",   placeholder: "Get Yours" },
    ],
  },
  {
    id:             "AdCinematic",
    name:           "Cinematic",
    duration:       "20s",
    accent:         "#b45309",
    bg:             "#fefce8",
    description:    "Slow reveal, golden-hour light. Premium, aspirational feel.",
    preview_url:    null,
    thumbnail_url:  null,
    required_angle: "three-quarter",
    angle_hint:     "3/4 angle. Dark or moody background works best.",
    text_slots: [
      { key: "hook",    label: "Hook",    maxChars: 28, hint: "Premium, aspirational. Think luxury tagline.",   placeholder: "This changes everything." },
      { key: "subtext", label: "Subtext", maxChars: 52, hint: "Emotional follow-up. Slow fade-in.",            placeholder: "Experience the difference." },
      { key: "cta",     label: "CTA",     maxChars: 16, hint: "Refined. Avoid hype words.",                   placeholder: "Shop Now" },
    ],
  },
  {
    id:             "AdLifestyle",
    name:           "Lifestyle",
    duration:       "20s",
    accent:         "#c2410c",
    bg:             "#fff7ed",
    description:    "Warm, human, built for social feeds.",
    preview_url:    null,
    thumbnail_url:  null,
    required_angle: "any",
    angle_hint:     "Any angle. Lifestyle or in-use shots work especially well.",
    text_slots: [
      { key: "hook",    label: "Hook",    maxChars: 28, hint: "Conversational. Like talking to a friend.",   placeholder: "Made for real life." },
      { key: "subtext", label: "Subtext", maxChars: 52, hint: "Relatable benefit. Everyday language.",       placeholder: "Built for the everyday." },
      { key: "cta",     label: "CTA",     maxChars: 16, hint: "Warm, inviting.",                            placeholder: "Discover More" },
    ],
  },
  {
    id:             "AdProduct",
    name:           "Product",
    duration:       "20s",
    accent:         "#0369a1",
    bg:             "#f0f9ff",
    description:    "Studio-clean with Ken Burns zoom. Sharp, confident, commercial.",
    preview_url:    null,
    thumbnail_url:  null,
    required_angle: "front",
    angle_hint:     "Dead-on front shot. White or neutral studio background.",
    text_slots: [
      { key: "hook",    label: "Hook",    maxChars: 36, hint: "Confident product claim.",    placeholder: "The product you've been waiting for." },
      { key: "subtext", label: "Subtext", maxChars: 52, hint: "Quality + proof.",            placeholder: "Premium quality. Proven results." },
      { key: "cta",     label: "CTA",     maxChars: 16, hint: "Direct.",                    placeholder: "Buy Now" },
    ],
  },
  {
    id:             "AdEnergetic",
    name:           "Energetic",
    duration:       "20s",
    accent:         "#dc2626",
    bg:             "#fef2f2",
    description:    "Fast. Bold. Urgent. High-saturation with snap animations.",
    preview_url:    null,
    thumbnail_url:  null,
    required_angle: "any",
    angle_hint:     "Any angle. High contrast or vibrant background works best.",
    text_slots: [
      { key: "hook",    label: "Hook",    maxChars: 20, hint: "Short. Punchy. Urgent. Max 4 words.",   placeholder: "Don't miss out." },
      { key: "subtext", label: "Subtext", maxChars: 40, hint: "Reinforce urgency.",                   placeholder: "Don't wait. Act now." },
      { key: "cta",     label: "CTA",     maxChars: 16, hint: "High energy. Exclamation optional.",   placeholder: "Get It Now" },
    ],
  },
  {
    id:             "AdTextForward",
    name:           "Text Forward",
    duration:       "20s",
    accent:         "#6d28d9",
    bg:             "#f5f3ff",
    description:    "Words are the ad. Dark background, word-by-word stagger.",
    preview_url:    null,
    thumbnail_url:  null,
    required_angle: "detail",
    angle_hint:     "Detail or texture shot. Product is secondary — the copy leads.",
    text_slots: [
      { key: "hook",    label: "Hook",    maxChars: 32, hint: "Philosophical or poetic. Words carry the weight.", placeholder: "Words that hit different." },
      { key: "subtext", label: "Subtext", maxChars: 52, hint: "Slower, quieter follow-up.",                      placeholder: "The words that matter most." },
      { key: "cta",     label: "CTA",     maxChars: 16, hint: "Understated.",                                    placeholder: "Learn More" },
    ],
  },
];


// Map composition prop keys per template
// (some use hook/cta, others use headline/ctaText — normalised at render time)
function buildRenderProps(template: { text_slots: TextSlot[] }, fields: Record<string, string>, imageUrl: string, brandName: string, primaryColor: string, accentColor: string) {
  const base = { imageUrl, brandName, primaryColor, accentColor };
  const text: Record<string, string> = {};
  for (const slot of template.text_slots) {
    text[slot.key] = fields[slot.key] ?? slot.placeholder;
  }
  // Always send both hook/headline and cta/ctaText aliases so compositions match
  return {
    ...base,
    ...text,
    hook:     text.hook     ?? text.headline ?? "",
    headline: text.headline ?? text.hook     ?? "",
    cta:      text.cta      ?? text.ctaText  ?? "",
    ctaText:  text.ctaText  ?? text.cta      ?? "",
    subtext:  text.subtext  ?? "",
  };
}

const VARIANT_TONES = [
  { key: "urgency",     label: "Urgency",     description: "Last chance energy" },
  { key: "aspirational",label: "Aspirational","description": "Elevated promise" },
  { key: "social",      label: "Social Proof","description": "Others love it" },
] as const;

type ToneKey = typeof VARIANT_TONES[number]["key"];
type RenderState = "idle" | "starting" | "rendering" | "done" | "error";

interface RenderJob {
  renderId:   string;
  bucketName: string;
  outputUrl:  string | null;
  state:      RenderState;
  progress:   number;
  error:      string | null;
}

// ─── UI colours ────────────────────────────────────────────────────────────────
const UI = {
  bg:      "#f8fafc",
  panel:   "#ffffff",
  border:  "rgba(15,23,42,0.1)",
  text:    "#0f172a",
  sub:     "rgba(15,23,42,0.52)",
  muted:   "rgba(15,23,42,0.36)",
  accent:  "#1d4ed8",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function pct(n: number) { return `${Math.round(n * 100)}%`; }

async function uploadFile(file: File): Promise<string> {
  // Step 1 — upload raw file to storage
  const form = new FormData();
  form.append("file", file);
  form.append("folder", "ad-products");
  const res  = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  const rawUrl = data.url as string;

  // Step 2 — remove background (silent fallback to raw URL if API not configured)
  try {
    const proc = await fetch("/api/product/process-image", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ image_url: rawUrl }),
    });
    if (proc.ok) {
      const procData = await proc.json();
      return procData.processed_url as string;
    }
  } catch { /* fall through to raw */ }

  return rawUrl;
}

async function startRender(params: {
  composition: string;
  imageUrl: string;
  headline: string;
  subtext: string;
  cta: string;
  brandName: string;
  primaryColor: string;
  accentColor: string;
}): Promise<{ renderId: string; bucketName: string }> {
  const res = await fetch("/api/agentica/render-ad", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      composition:   params.composition,
      image_url:     params.imageUrl,
      headline:      params.headline,
      hook:          params.headline,
      subtext:       params.subtext,
      cta:           params.cta,
      cta_text:      params.cta,
      brand_name:    params.brandName,
      primary_color: params.primaryColor,
      accent_color:  params.accentColor,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Render failed to start");
  return { renderId: data.render_id, bucketName: data.bucket_name };
}

async function startOverlayRender(params: {
  backgroundVideoUrl: string;
  imageUrl:           string;
  overlayConfig:      OverlayConfig;
  durationSec:        number;
}): Promise<{ renderId: string; bucketName: string }> {
  const res = await fetch("/api/agentica/render-ad", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      composition:        "AdVideoOverlay",
      background_video_url: params.backgroundVideoUrl,
      image_url:          params.imageUrl,
      image_x:            params.overlayConfig.x_pct,
      image_y:            params.overlayConfig.y_pct,
      image_width:        params.overlayConfig.width_pct,
      image_height:       params.overlayConfig.height_pct,
      image_start_sec:    params.overlayConfig.start_sec,
      image_end_sec:      params.overlayConfig.end_sec ?? 0,
      image_entrance:     params.overlayConfig.entrance,
      duration_sec:       params.durationSec,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Render failed to start");
  return { renderId: data.render_id, bucketName: data.bucket_name };
}

// ── AdMeta render — passes full schema; productImageUrl fills products[0] ──────
async function startAdMetaRender(params: {
  schema:          AdSchema;
  productImageUrl: string;
}): Promise<{ renderId: string; bucketName: string }> {
  // Inject the product image into the schema copy (never mutate original)
  const filledSchema: AdSchema = {
    ...params.schema,
    products: params.schema.products.map((p, i) =>
      i === 0 ? { ...p, image_url: params.productImageUrl } : p,
    ),
  };
  const res = await fetch("/api/agentica/render-ad", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ composition: "AdMeta", ad_schema: filledSchema }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Render failed to start");
  return { renderId: data.render_id, bucketName: data.bucket_name };
}

async function pollStatus(renderId: string, bucketName: string): Promise<{ status: string; outputUrl: string | null; progress: number; error?: string }> {
  const res  = await fetch(`/api/agentica/render-status?render_id=${renderId}&bucket_name=${bucketName}`);
  const data = await res.json();
  return { status: data.status, outputUrl: data.outputUrl ?? null, progress: data.progress ?? 0, error: data.error };
}

// ─── RenderCard ────────────────────────────────────────────────────────────────
function RenderCard({ job, label }: { job: RenderJob; label: string }) {
  return (
    <div className="rounded-[20px] border overflow-hidden" style={{ borderColor: UI.border, background: UI.panel }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: UI.border }}>
        <p className="text-sm font-semibold" style={{ color: UI.text }}>{label}</p>
        {job.state === "done" && <CheckCircle size={16} weight="fill" style={{ color: "#15803d" }} />}
        {job.state === "error" && <WarningCircle size={16} weight="fill" style={{ color: "#dc2626" }} />}
        {(job.state === "starting" || job.state === "rendering") && (
          <CircleNotch size={16} className="animate-spin" style={{ color: UI.accent }} />
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Progress bar */}
        {(job.state === "starting" || job.state === "rendering") && (
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-xs" style={{ color: UI.sub }}>
                {job.state === "starting" ? "Starting render…" : "Rendering…"}
              </span>
              <span className="text-xs font-semibold" style={{ color: UI.accent }}>{pct(job.progress)}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(29,78,216,0.1)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: pct(Math.max(0.04, job.progress)), background: UI.accent }}
              />
            </div>
          </div>
        )}

        {job.state === "error" && (
          <p className="text-xs" style={{ color: "#dc2626" }}>{job.error ?? "Render failed. Check Lambda config."}</p>
        )}

        {job.state === "done" && job.outputUrl && (
          <div className="space-y-2">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={job.outputUrl}
              controls
              className="w-full rounded-[14px]"
              style={{ maxHeight: 240, background: "#000" }}
            />
            <a
              href={job.outputUrl}
              download
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[14px] text-sm font-semibold transition"
              style={{ background: "rgba(29,78,216,0.08)", color: UI.accent }}
            >
              <DownloadSimple size={16} weight="bold" />
              Download MP4
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reference → Template pipeline ────────────────────────────────────────────

// Extract a single frame from a video File at the given timestamp.
// Returns a File (JPEG) that can be uploaded directly as the hero image.
function extractFrameFromVideo(file: File, seconds: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const video  = document.createElement("video");
    const canvas = document.createElement("canvas");
    const src    = URL.createObjectURL(file);
    video.src    = src;
    video.muted  = true;
    video.preload = "auto";

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(Math.max(0, seconds), video.duration - 0.05);
    };

    video.onseeked = () => {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(src); reject(new Error("No canvas context")); return; }
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(src);
        if (blob) resolve(new File([blob], "hero-frame.jpg", { type: "image/jpeg" }));
        else reject(new Error("Frame extraction failed"));
      }, "image/jpeg", 0.93);
    };

    video.onerror = () => { URL.revokeObjectURL(src); reject(new Error("Video failed to load")); };
  });
}


function isValidHex(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractColors(analysis: Record<string, any>): { primary: string; accent: string } {
  // New schema shape: ad_schema.background.color
  const schema = analysis?.ad_schema;
  if (schema) {
    const bg  = isValidHex(schema?.background?.color) ? schema.background.color : "#ffffff";
    // Accent: first CTA text layer background colour, or first text layer colour
    const cta = schema?.text_layers?.find((l: Record<string, unknown>) => l.role === "cta");
    const accent = isValidHex(cta?.background?.color)
      ? (cta.background.color as string)
      : isValidHex(cta?.color)
        ? (cta.color as string)
        : "#1d4ed8";
    return { primary: bg, accent };
  }
  // Legacy shape
  const p = analysis?.color_palette ?? {};
  return {
    primary: isValidHex(p.primary_background_color) ? p.primary_background_color : "#ffffff",
    accent:  isValidHex(p.accent_color)             ? p.accent_color             : "#1d4ed8",
  };
}

type RefPhase = "drop" | "analyzing" | "compat" | "build" | "rendering" | "saved" | "error";

type RemotionCompat = {
  verdict:              "renderable" | "approximable" | "not_recommended";
  blocking_effects:     { effect: string; element: string; timestamp_seconds: number; reason: string }[];
  approximable_effects: { effect: string; element: string; reason: string }[];
  minor_differences:    { detail: string }[];
  font_risk:            "low" | "medium" | "high";
  font_notes:           string;
};

function ReferenceAnalyzer({ onTemplateSaved }: { onTemplateSaved: () => void }) {
  const [phase,           setPhase]          = useState<RefPhase>("drop");
  const [error,           setError]          = useState<string | null>(null);
  const [dragOver,        setDragOver]       = useState(false);
  const [fileName,        setFileName]       = useState<string | null>(null);
  const [fileSize,        setFileSize]       = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analysis,        setAnalysis]       = useState<Record<string, any> | null>(null);
  const [videoFile,       setVideoFile]      = useState<File | null>(null);
  const [extractingFrame, setExtractingFrame]= useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Compatibility gate — from Gemini analysis
  const [compat, setCompat] = useState<RemotionCompat | null>(null);

  // Normalized AdSchema — the full render blueprint (Plan B)
  const [refSchema, setRefSchema] = useState<AdSchema | null>(null);

  // Overlay state — from Gemini analysis + video upload
  const [videoUploadUrl, setVideoUploadUrl] = useState<string | null>(null);
  const [overlayConfig,  setOverlayConfig]  = useState<OverlayConfig | null>(null);
  const [durationSec,    setDurationSec]    = useState<number>(15);

  // Template card aesthetics
  const [primaryColor,  setPrimaryColor]  = useState("#ffffff");
  const [accentColor,   setAccentColor]   = useState("#1d4ed8");
  const [templateName,  setTemplateName]  = useState("");
  const [heroTimestamp, setHeroTimestamp] = useState<number>(0);

  // Hero frame extracted from the video
  const [imgPreview,   setImgPreview]   = useState<string | null>(null);
  const [imgFile,      setImgFile]      = useState<File | null>(null);
  const [imgUrl,       setImgUrl]       = useState<string | null>(null);
  const [imgUploading, setImgUploading] = useState(false);

  // Render
  const [renderJob, setRenderJob] = useState<RenderJob | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [showColors, setShowColors] = useState(false);

  // ── Auto-extract a frame at the given timestamp ──────────────────────────
  async function extractHero(file: File, seconds: number) {
    setExtractingFrame(true);
    try {
      const frameFile = await extractFrameFromVideo(file, seconds);
      setImgFile(frameFile);
      setImgPreview(URL.createObjectURL(frameFile));
      setImgUrl(null);
    } catch {
      // Frame extraction failed — admin can retry below
    } finally {
      setExtractingFrame(false);
    }
  }

  // ── Step 1: drop video → upload to storage + Gemini analysis (parallel) ──
  async function runAnalysis(file: File) {
    if (!file.type.startsWith("video/")) { setError("Upload a video file (MP4, MOV, WEBM)."); return; }
    const mb = file.size / 1024 / 1024;
    if (mb > 20) { setError(`File is ${mb.toFixed(1)}MB — max 20MB.`); return; }

    setFileName(file.name);
    setFileSize(`${mb.toFixed(1)}MB`);
    setVideoFile(file);
    setError(null);
    setPhase("analyzing");

    // Upload video to storage so Remotion Lambda can access it via public URL,
    // while simultaneously sending it to Gemini for frame-by-frame analysis.
    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("folder", "reference-videos");
    const uploadPromise = fetch("/api/upload", { method: "POST", body: uploadForm })
      .then(r => r.json())
      .then(d => { if (!d.url) throw new Error(d.error ?? "Video upload failed"); return d.url as string; });

    const analyzeForm = new FormData();
    analyzeForm.append("file", file);
    const analyzePromise = fetch("/api/analyze-reference-video", { method: "POST", body: analyzeForm })
      .then(r => r.json());

    try {
      const [uploadedUrl, data] = await Promise.all([uploadPromise, analyzePromise]);

      if (!data.analysis) { setError(data.error ?? "Analysis failed"); setPhase("error"); return; }

      setVideoUploadUrl(uploadedUrl);
      const a = data.analysis;
      setAnalysis(a);

      // Normalize and store the AdSchema (new prompt shape)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const schema: Record<string, any> | null = data.ad_schema ?? null;
      if (schema) setRefSchema(normalizeSchema(schema));

      // Colors for template card
      const colors = extractColors(a);
      setPrimaryColor(colors.primary);
      setAccentColor(colors.accent);

      // Overlay position/timing — read hero product from new ad_schema, fall back to legacy
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const heroProduct: Record<string, any> | null = schema?.products?.[0] ?? null;
      const ov = heroProduct ?? a?.product_placement?.overlay;
      setOverlayConfig({
        x_pct:      typeof ov?.x_pct      === "number" ? ov.x_pct      : 10,
        y_pct:      typeof ov?.y_pct      === "number" ? ov.y_pct      : 15,
        width_pct:  typeof ov?.width_pct  === "number" ? ov.width_pct  : 80,
        height_pct: typeof ov?.height_pct === "number" ? ov.height_pct : 55,
        start_sec:  typeof (heroProduct?.entrance_start_sec ?? ov?.start_sec) === "number"
                      ? (heroProduct?.entrance_start_sec ?? ov?.start_sec) : 0,
        end_sec:    typeof (heroProduct?.exit_start_sec ?? ov?.end_sec) === "number"
                      ? (heroProduct?.exit_start_sec ?? ov?.end_sec) : null,
        entrance:   (["scale","fade","slide_up","slide_right","none"] as const).includes(
                      heroProduct?.entrance ?? ov?.entrance)
                      ? (heroProduct?.entrance ?? ov?.entrance) : "scale",
      });

      // Video duration — new: ad_schema.duration_sec, legacy: overview.total_duration_seconds
      const dur = schema?.duration_sec ?? a?.overview?.total_duration_seconds;
      setDurationSec(typeof dur === "number" && dur > 0 ? dur : 15);

      // Template name — new: brand text layer content, legacy: extracted_copy.brand_name
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const brandLayer = schema?.text_layers?.find((l: Record<string, any>) => l.role === "brand");
      const brandName = brandLayer?.content
        ?? a?.extracted_copy?.brand_name
        ?? file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      setTemplateName(brandName);

      // Auto-extract hero frame at Gemini's identified timestamp
      const ts = typeof data.hero_product?.best_frame_seconds === "number"
        ? data.hero_product.best_frame_seconds
        : typeof a?.hero_product?.best_frame_seconds === "number"
          ? a.hero_product.best_frame_seconds : 0;
      setHeroTimestamp(ts);

      // Compatibility gate — always extract frame in background, gate the phase
      void extractHero(file, ts);

      const compatData = (data.remotion_compatibility ?? a?.remotion_compatibility) as RemotionCompat | undefined;
      if (compatData) setCompat(compatData);

      // Renderable → skip gate, go straight to build
      // Approximable / not_recommended → show the compat review screen
      if (!compatData || compatData.verdict === "renderable") {
        setPhase("build");
      } else {
        setPhase("compat");
      }

    } catch (e) {
      setError((e as Error).message);
      setPhase("error");
    }
  }

  // ── Step 2: upload hero frame → render → auto-save template ──────────────
  // Uses AdMeta (full schema) when Gemini returned ad_schema; falls back to AdVideoOverlay.
  async function handleRenderAndSave() {
    if (!imgFile) return;
    if (!refSchema && (!videoUploadUrl || !overlayConfig)) return;

    try {
      setImgUploading(true);
      let url = imgUrl;
      if (!url) { url = await uploadFile(imgFile); setImgUrl(url); }
      setImgUploading(false);

      const job: RenderJob = { renderId: "", bucketName: "", outputUrl: null, state: "starting", progress: 0, error: null };
      setRenderJob(job);
      setPhase("rendering");

      let renderId: string, bucketName: string;

      if (refSchema) {
        // ── Plan B: full AdMeta render ──────────────────────────────────────
        // Fill background src_url if the ad uses a video/image background —
        // the prompt always outputs "" for src_url; we inject the uploaded reference URL here.
        let schemaToRender = refSchema;
        if (
          (refSchema.background.type === "video" || refSchema.background.type === "image") &&
          videoUploadUrl
        ) {
          schemaToRender = {
            ...refSchema,
            background: { ...refSchema.background, src_url: videoUploadUrl },
          };
        }
        ({ renderId, bucketName } = await startAdMetaRender({ schema: schemaToRender, productImageUrl: url }));
      } else {
        // ── Plan A fallback: AdVideoOverlay ────────────────────────────────
        ({ renderId, bucketName } = await startOverlayRender({
          backgroundVideoUrl: videoUploadUrl!,
          imageUrl:           url,
          overlayConfig:      overlayConfig!,
          durationSec,
        }));
      }
      setRenderJob(prev => ({ ...(prev ?? job), renderId, bucketName }));

      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const { status, outputUrl, progress } = await pollStatus(renderId, bucketName);
          if (status === "done") {
            clearInterval(pollRef.current!);
            setRenderJob(prev => prev ? { ...prev, state: "done", outputUrl, progress: 1 } : prev);
            // Auto-save as template
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const heroDesc = (analysis as any)?.hero_product?.description ?? "Hero product image";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const energyDesc = (analysis as any)?.overview?.overall_energy
              ?? refSchema?.motion?.overall_pacing ?? null;

            const templatePayload: Record<string, unknown> = {
              name:           templateName || "Reference Template",
              composition_id: refSchema ? "AdMeta" : "AdVideoOverlay",
              video_url:      outputUrl,
              duration:       `${Math.round(durationSec)}s`,
              accent_color:   accentColor,
              bg_color:       primaryColor,
              description:    energyDesc,
              text_slots:     [],
              required_angle: "any",
              angle_hint:     heroDesc,
              duration_sec:   durationSec,
            };

            if (refSchema) {
              // Store schema with background src_url filled (video/image backgrounds need the URL).
              // products[0].image_url stays "" — consumers inject their own image at render time.
              const schemaToStore =
                (refSchema.background.type === "video" || refSchema.background.type === "image") && videoUploadUrl
                  ? { ...refSchema, background: { ...refSchema.background, src_url: videoUploadUrl } }
                  : refSchema;
              templatePayload.ad_schema = schemaToStore;
            } else {
              templatePayload.background_video_url = videoUploadUrl;
              templatePayload.overlay_config       = overlayConfig;
            }

            await fetch("/api/agentica/templates", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify(templatePayload),
            });
            setPhase("saved");
            onTemplateSaved();
          } else if (status === "failed") {
            clearInterval(pollRef.current!);
            const errMsg = error ?? "Render failed — check server logs for details.";
            setRenderJob(prev => prev ? { ...prev, state: "error", error: errMsg } : prev);
            setError(errMsg); setPhase("error");
          } else {
            setRenderJob(prev => prev ? { ...prev, state: "rendering", progress } : prev);
          }
        } catch { clearInterval(pollRef.current!); setError("Status check failed."); setPhase("error"); }
      }, 4000);
    } catch (err) {
      setImgUploading(false); setError((err as Error).message); setPhase("error");
    }
  }

  function reset() {
    if (pollRef.current) clearInterval(pollRef.current);
    setPhase("drop"); setError(null); setAnalysis(null);
    setFileName(null); setFileSize(null); setVideoFile(null);
    setImgFile(null); setImgPreview(null); setImgUrl(null);
    setRenderJob(null); setExtractingFrame(false);
    setVideoUploadUrl(null); setOverlayConfig(null); setCompat(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  const canRender = !!imgFile && !!videoUploadUrl && !!overlayConfig && !imgUploading && !extractingFrame;

  return (
    <div className="rounded-[24px] border overflow-hidden" style={{ borderColor: UI.border, background: UI.panel }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b"
        style={{ borderColor: UI.border, background: "rgba(15,23,42,0.02)" }}>
        <div className="w-9 h-9 rounded-[14px] flex items-center justify-center"
          style={{ background: "rgba(29,78,216,0.1)" }}>
          <VideoCamera size={18} style={{ color: UI.accent }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: UI.text }}>Create Template from Reference Ad</p>
          <p className="text-xs mt-0.5" style={{ color: UI.sub }}>
            Drop any ad — Gemini finds the hero product and its position. We copy the video exactly, users swap in their own image.
          </p>
        </div>
        {phase !== "drop" && phase !== "analyzing" && (
          <button onClick={reset} className="text-xs font-semibold px-3 py-1.5 rounded-full shrink-0"
            style={{ background: "rgba(15,23,42,0.06)", color: UI.sub }}>
            Start over
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">

        {/* ── Phase: drop ── */}
        {(phase === "drop" || phase === "error") && (
          <>
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) runAnalysis(f); }} />
            <div
              className="rounded-[20px] border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-3 py-14"
              style={{
                borderColor: dragOver ? UI.accent : UI.border,
                background:  dragOver ? "rgba(29,78,216,0.04)" : "rgba(15,23,42,0.015)",
              }}
              onClick={() => videoInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) runAnalysis(f); }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(29,78,216,0.08)" }}>
                <VideoCamera size={28} style={{ color: UI.accent }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: UI.text }}>Drop the reference ad you want to copy</p>
                <p className="text-xs mt-1" style={{ color: UI.sub }}>MP4, MOV, WEBM · Max 20MB · Gemini maps the hero product position</p>
              </div>
            </div>
            {error && (
              <div className="rounded-[14px] px-4 py-3 flex items-start gap-2.5"
                style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)" }}>
                <WarningCircle size={15} weight="fill" className="shrink-0 mt-0.5" style={{ color: "#dc2626" }} />
                <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>
              </div>
            )}
          </>
        )}

        {/* ── Phase: analyzing ── */}
        {phase === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-14 gap-4">
            <CircleNotch size={32} className="animate-spin" style={{ color: UI.accent }} />
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: UI.text }}>Uploading &amp; analyzing…</p>
              <p className="text-xs mt-1" style={{ color: UI.sub }}>{fileName} · {fileSize}</p>
              <p className="text-xs mt-1" style={{ color: UI.muted }}>
                Uploading to storage + Gemini reading every frame · 20–50s
              </p>
            </div>
          </div>
        )}

        {/* ── Phase: compat ── */}
        {phase === "compat" && compat && (() => {
          const isRed    = compat.verdict === "not_recommended";
          const isYellow = compat.verdict === "approximable";

          return (
            <div className="space-y-3">

              {/* Verdict banner */}
              <div className="rounded-[16px] px-4 py-3.5 flex items-center gap-3"
                style={{
                  background: isRed ? "rgba(220,38,38,0.05)" : "rgba(234,179,8,0.05)",
                  border: `1px solid ${isRed ? "rgba(220,38,38,0.2)" : "rgba(234,179,8,0.25)"}`,
                }}>
                {/* Color dot */}
                <div className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: isRed ? "#dc2626" : "#eab308", boxShadow: `0 0 8px ${isRed ? "#dc2626" : "#eab308"}` }} />
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: UI.text }}>
                    {isRed
                      ? "This ad uses effects Remotion cannot reproduce"
                      : "This ad can be rebuilt — a few things will look slightly different"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: UI.sub }}>
                    {isRed
                      ? "We recommend choosing a different reference video."
                      : "Review the notes below. Most users won't notice the difference."}
                  </p>
                </div>
              </div>

              {/* Blocking effects — red */}
              {compat.blocking_effects.map((e, i) => (
                <div key={i} className="rounded-[14px] px-4 py-3 flex items-start gap-3"
                  style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.15)" }}>
                  <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: "#dc2626" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-xs font-bold" style={{ color: "#dc2626" }}>
                        {e.effect.replace(/_/g, " ")}
                      </p>
                      {e.element && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}>
                          {e.element}
                        </span>
                      )}
                      <span className="text-[10px]" style={{ color: "rgba(220,38,38,0.55)" }}>
                        at {e.timestamp_seconds.toFixed(1)}s
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: UI.sub }}>{e.reason}</p>
                  </div>
                </div>
              ))}

              {/* Approximable effects — yellow */}
              {compat.approximable_effects.map((e, i) => (
                <div key={i} className="rounded-[14px] px-4 py-3 flex items-start gap-3"
                  style={{ background: "rgba(234,179,8,0.04)", border: "1px solid rgba(234,179,8,0.18)" }}>
                  <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: "#eab308" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-xs font-bold" style={{ color: "#a16207" }}>
                        {e.effect.replace(/_/g, " ")}
                      </p>
                      {e.element && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(234,179,8,0.1)", color: "#a16207" }}>
                          {e.element}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: UI.sub }}>{e.reason}</p>
                  </div>
                </div>
              ))}

              {/* Font — green / yellow / red */}
              {compat.font_notes && (
                <div className="rounded-[14px] px-4 py-3 flex items-start gap-3"
                  style={{ background: "rgba(15,23,42,0.02)", border: `1px solid ${UI.border}` }}>
                  <div className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                    style={{ background: compat.font_risk === "high" ? "#dc2626" : compat.font_risk === "medium" ? "#eab308" : "#15803d" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold mb-0.5" style={{ color: UI.text }}>
                      font · {compat.font_risk} risk
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: UI.sub }}>{compat.font_notes}</p>
                  </div>
                </div>
              )}

              {/* Minor differences — grey, collapsible feel */}
              {compat.minor_differences?.length > 0 && (
                <div className="rounded-[14px] border overflow-hidden" style={{ borderColor: UI.border }}>
                  <div className="px-4 py-2 border-b" style={{ borderColor: UI.border, background: "rgba(15,23,42,0.02)" }}>
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: UI.muted }}>
                      Minor inherent differences
                    </span>
                  </div>
                  <div className="divide-y" style={{ borderColor: UI.border }}>
                    {compat.minor_differences.map((d, i) => (
                      <div key={i} className="px-4 py-2.5 flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: UI.muted }} />
                        <p className="text-xs leading-relaxed" style={{ color: UI.muted }}>{d.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button onClick={reset}
                  className="flex-1 py-3 rounded-[16px] text-sm font-semibold border"
                  style={{ borderColor: UI.border, color: UI.sub }}>
                  Try a different video
                </button>
                <button onClick={() => setPhase("build")}
                  className="flex-1 py-3 rounded-[16px] text-sm font-bold"
                  style={{
                    background: isRed    ? "#dc2626" : UI.accent,
                    color:      "#fff",
                    opacity:    isRed    ? 0.9       : 1,
                  }}>
                  {isRed ? "Proceed anyway" : "Proceed"}
                </button>
              </div>

            </div>
          );
        })()}

        {/* ── Phase: build ── */}
        {phase === "build" && (
          <div className="space-y-5">

            {/* Analysis success banner */}
            <div className="rounded-[16px] px-4 py-3 flex items-center gap-3"
              style={{ background: "rgba(21,128,61,0.05)", border: "1px solid rgba(21,128,61,0.18)" }}>
              <CheckCircle size={18} weight="fill" style={{ color: "#15803d" }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold" style={{ color: UI.text }}>
                  Video analyzed · overlay mode
                  <span className="ml-2 font-normal px-2 py-0.5 rounded-full text-[10px]"
                    style={{ background: "rgba(29,78,216,0.1)", color: UI.accent }}>
                    AdVideoOverlay · {Math.round(durationSec)}s
                  </span>
                </p>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {((analysis as any)?.overview?.overall_energy
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ?? ((analysis as any)?.ad_schema
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ? `${(analysis as any).ad_schema.aspect_ratio} · ${(analysis as any).ad_schema.motion?.overall_pacing ?? ""}`
                    : null)) && (
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: UI.sub }}>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(analysis as any)?.overview?.overall_energy
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ?? `${(analysis as any).ad_schema?.aspect_ratio ?? ""} · ${(analysis as any).ad_schema?.motion?.overall_pacing ?? ""}`}
                  </p>
                )}
              </div>
            </div>

            {/* Overlay config — what Gemini detected */}
            {overlayConfig && (
              <div className="rounded-[14px] px-4 py-3 grid grid-cols-3 gap-3"
                style={{ background: "rgba(29,78,216,0.04)", border: "1px solid rgba(29,78,216,0.12)" }}>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: UI.muted }}>Position</p>
                  <p className="text-xs font-bold" style={{ color: UI.text }}>
                    {Math.round(overlayConfig.x_pct)}%, {Math.round(overlayConfig.y_pct)}%
                  </p>
                  <p className="text-[10px]" style={{ color: UI.sub }}>left, top</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: UI.muted }}>Size</p>
                  <p className="text-xs font-bold" style={{ color: UI.text }}>
                    {Math.round(overlayConfig.width_pct)}% × {Math.round(overlayConfig.height_pct)}%
                  </p>
                  <p className="text-[10px]" style={{ color: UI.sub }}>width × height</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: UI.muted }}>Entrance</p>
                  <p className="text-xs font-bold" style={{ color: UI.text }}>
                    {overlayConfig.entrance}
                  </p>
                  <p className="text-[10px]" style={{ color: UI.sub }}>at {overlayConfig.start_sec}s</p>
                </div>
              </div>
            )}

            {/* Template name */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: UI.sub }}>Template Name</label>
              <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)}
                placeholder="e.g. Dark Hype Launch"
                className="w-full rounded-[14px] border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: UI.border, background: UI.bg, color: UI.text }} />
            </div>

            {/* ── Hero frame ── */}
            <div className="rounded-[20px] border-2 overflow-hidden"
              style={{ borderColor: `${UI.accent}30`, background: `${UI.accent}04` }}>

              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: `${UI.accent}18` }}>
                <div>
                  <p className="text-sm font-bold" style={{ color: UI.text }}>Hero Product Frame</p>
                  <p className="text-xs mt-0.5" style={{ color: UI.sub }}>
                    Extracted at {heroTimestamp.toFixed(1)}s — this is what consumers will swap out.
                  </p>
                </div>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(analysis as any)?.hero_product?.description && (
                  <span className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full ml-3"
                    style={{ background: `${UI.accent}12`, color: UI.accent }}>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(analysis as any).hero_product.description}
                  </span>
                )}
              </div>

              <div className="p-5 space-y-3">
                <div className="relative rounded-[16px] overflow-hidden bg-black flex items-center justify-center"
                  style={{ minHeight: 200 }}>
                  {extractingFrame ? (
                    <div className="flex flex-col items-center gap-2 py-10">
                      <CircleNotch size={24} className="animate-spin" style={{ color: UI.accent }} />
                      <p className="text-xs" style={{ color: UI.sub }}>Extracting at {heroTimestamp.toFixed(1)}s…</p>
                    </div>
                  ) : imgPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgPreview} alt="Hero frame" className="w-full object-contain" style={{ maxHeight: 280 }} />
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-10">
                      <WarningCircle size={20} style={{ color: UI.muted }} />
                      <p className="text-xs" style={{ color: UI.muted }}>Frame extraction failed</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <p className="text-[11px] shrink-0" style={{ color: UI.muted }}>Try different frame:</p>
                  <input
                    type="number" min={0} step={0.5}
                    value={heroTimestamp}
                    onChange={e => setHeroTimestamp(Number(e.target.value))}
                    className="w-20 rounded-[10px] border px-2 py-1.5 text-xs outline-none"
                    style={{ borderColor: UI.border, background: UI.bg, color: UI.text }}
                  />
                  <span className="text-[11px]" style={{ color: UI.muted }}>s</span>
                  <button
                    onClick={() => videoFile && extractHero(videoFile, heroTimestamp)}
                    disabled={extractingFrame || !videoFile}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-[10px] disabled:opacity-40"
                    style={{ background: `${UI.accent}12`, color: UI.accent }}
                  >
                    {extractingFrame ? "Extracting…" : "Re-extract"}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Card colors (collapsible) ── */}
            <div className="rounded-[16px] border overflow-hidden" style={{ borderColor: UI.border }}>
              <button onClick={() => setShowColors(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
                style={{ background: "rgba(15,23,42,0.02)" }}>
                <span className="text-xs font-semibold" style={{ color: UI.sub }}>Template card colors</span>
                <span className="text-xs" style={{ color: UI.muted }}>{showColors ? "▲ hide" : "▼ show"}</span>
              </button>
              {showColors && (
                <div className="px-4 pb-4 pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: UI.sub }}>Background</label>
                      <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                        className="w-full h-10 rounded-[12px] border cursor-pointer" style={{ borderColor: UI.border }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: UI.sub }}>Accent</label>
                      <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                        className="w-full h-10 rounded-[12px] border cursor-pointer" style={{ borderColor: UI.border }} />
                    </div>
                  </div>
                  <p className="text-[10px]" style={{ color: UI.muted }}>Auto-extracted from reference · adjust if needed</p>
                </div>
              )}
            </div>

            {/* ── Render & Save button ── */}
            <button onClick={handleRenderAndSave} disabled={!canRender}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-[18px] text-base font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: canRender ? UI.accent : `${UI.accent}55`,
                color: "#fff",
                boxShadow: canRender ? `0 12px 32px ${UI.accent}44` : "none",
              }}>
              {imgUploading ? (
                <><CircleNotch size={18} className="animate-spin" /> Uploading frame…</>
              ) : extractingFrame ? (
                <><CircleNotch size={18} className="animate-spin" /> Extracting hero…</>
              ) : (
                <><FilmSlate size={18} weight="fill" /> Render &amp; Save as Template</>
              )}
            </button>
            {!imgFile && !extractingFrame && (
              <p className="text-xs text-center" style={{ color: UI.muted }}>
                Hero frame extraction failed — try a different timestamp above
              </p>
            )}

          </div>
        )}

        {/* ── Phase: rendering ── */}
        {phase === "rendering" && renderJob && (
          <div className="space-y-3">
            <p className="text-xs font-semibold" style={{ color: UI.muted }}>Rendering template…</p>
            <div className="max-w-sm">
              <RenderCard job={renderJob} label={templateName || "Template"} />
            </div>
          </div>
        )}

        {/* ── Phase: saved ── */}
        {phase === "saved" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(21,128,61,0.1)" }}>
              <CheckCircle size={30} weight="fill" style={{ color: "#15803d" }} />
            </div>
            <div className="text-center">
              <p className="text-base font-bold" style={{ color: UI.text }}>Template saved</p>
              <p className="text-sm mt-1" style={{ color: UI.sub }}>
                &ldquo;{templateName}&rdquo; is now live in the template library.
              </p>
              <p className="text-xs mt-1" style={{ color: UI.muted }}>Users can pick it and swap in their own product image.</p>
            </div>
            <button onClick={reset} className="text-sm font-semibold px-5 py-2 rounded-full"
              style={{ background: "rgba(15,23,42,0.06)", color: UI.sub }}>
              Add another template
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Template card ─────────────────────────────────────────────────────────────
// portrait=false → consumer screensaver card (video autoplays on loop)
// portrait=true  → portrait video card (admin)
function VideoTemplateCard({
  t, activeId, onSelect, onDelete, portrait = false,
}: {
  t: DbTemplate;
  activeId: string | null;
  onSelect: (t: DbTemplate) => void;
  onDelete?: (t: DbTemplate) => void;
  portrait?: boolean;
}) {
  const isActive = activeId === t.id;

  // Shared hover-play props for admin portrait cards (hover to preview)
  const hoverVideoProps = {
    src: t.video_url,
    muted: true,
    playsInline: true,
    preload: "metadata" as const,
    onMouseEnter: (e: React.MouseEvent<HTMLVideoElement>) =>
      (e.currentTarget as HTMLVideoElement).play().catch(() => {}),
    onMouseLeave: (e: React.MouseEvent<HTMLVideoElement>) => {
      const v = e.currentTarget as HTMLVideoElement;
      v.pause(); v.currentTime = 0;
    },
  };

  // Delete button — sits in the hover overlay, stops propagation so it doesn't also select
  const DeleteBtn = onDelete ? (
    <button
      onClick={e => { e.stopPropagation(); onDelete(t); }}
      title="Delete template"
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all"
      style={{
        background: "rgba(220,38,38,0.85)",
        backdropFilter: "blur(6px)",
        color: "#fff",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(185,28,28,0.95)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,38,38,0.85)"; }}
    >
      <TrashSimple size={12} weight="fill" />
      Delete
    </button>
  ) : null;

  if (portrait) {
    // Portrait card — admin grid (9:16)
    return (
      <div
        className="group relative text-left rounded-[22px] border overflow-hidden transition-all cursor-pointer"
        style={{
          borderColor: isActive ? t.accent_color : UI.border,
          background:  isActive ? t.bg_color : UI.panel,
          boxShadow:   isActive ? `0 0 0 2px ${t.accent_color}55, 0 8px 24px ${t.accent_color}18` : "none",
          transform:   isActive ? "translateY(-2px)" : "none",
        }}
        onClick={() => onSelect(t)}
      >
        <div className="relative overflow-hidden bg-black" style={{ aspectRatio: "9/16" }}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video {...hoverVideoProps} className="w-full h-full object-cover" />
          <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>{t.duration}</span>

          {isActive && (
            <div className="absolute inset-0 flex items-end p-2"
              style={{ background: `linear-gradient(to top, ${t.accent_color}cc 0%, transparent 60%)` }}>
              <div className="flex items-center gap-1">
                <CheckCircle size={12} weight="fill" className="text-white" />
                <span className="text-[11px] font-bold text-white">Selected</span>
              </div>
            </div>
          )}

          {/* Hover overlay with Delete */}
          {DeleteBtn && (
            <div className="absolute inset-0 flex items-start justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {DeleteBtn}
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="text-sm font-bold" style={{ color: isActive ? t.accent_color : UI.text }}>{t.name}</p>
          {t.description && <p className="text-[11px] mt-0.5 leading-snug" style={{ color: UI.sub }}>{t.description}</p>}
        </div>
      </div>
    );
  }

  // ── Consumer screensaver card ──────────────────────────────────────────────
  // Video autoplays on loop — the rendered Remotion ad IS the card preview.
  return (
    <div
      className="group relative text-left rounded-[22px] border overflow-hidden w-full transition-all cursor-pointer"
      style={{
        borderColor: isActive ? t.accent_color : UI.border,
        background:  UI.panel,
        boxShadow:   isActive
          ? `0 0 0 3px ${t.accent_color}55, 0 12px 36px ${t.accent_color}22`
          : `0 2px 8px rgba(15,23,42,0.06)`,
        transform: isActive ? "translateY(-2px)" : "none",
      }}
      onClick={() => onSelect(t)}
    >
      {/* ── Video screensaver area ── */}
      <div className="relative bg-black overflow-hidden" style={{ aspectRatio: "16/9" }}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={t.video_url}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ background: "#000" }}
        />

        {/* Top-right duration pill */}
        <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}>
          {t.duration}
        </span>

        {/* Selected checkmark */}
        {isActive && (
          <div className="absolute top-2.5 left-2.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: t.accent_color }}>
              <CheckCircle size={14} weight="fill" className="text-white" />
            </div>
          </div>
        )}

        {/* Hover overlay — "Use this template" + Delete */}
        <div
          className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)" }}
        >
          <div className="w-full px-3 pb-3 flex items-center justify-between">
            <span className="text-[11px] font-bold text-white">Use this template</span>
            <div className="flex items-center gap-2">
              {DeleteBtn}
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ background: t.accent_color }}>Select →</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Card info ── */}
      <div className="px-3.5 py-3 flex items-center justify-between gap-2"
        style={{ background: isActive ? `${t.accent_color}06` : "transparent" }}>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate"
            style={{ color: isActive ? t.accent_color : UI.text }}>{t.name}</p>
          {t.description && (
            <p className="text-[11px] mt-0.5 truncate" style={{ color: UI.sub }}>{t.description}</p>
          )}
        </div>
        {isActive && (
          <div className="shrink-0 flex items-center gap-1">
            <CheckCircle size={13} weight="fill" style={{ color: t.accent_color }} />
            <span className="text-[11px] font-semibold" style={{ color: t.accent_color }}>Selected</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton placeholder (consumer empty state) ──────────────────────────────
function TemplatePlaceholder() {
  return (
    <div>
      {/* Screensaver card skeletons — 16:9 video area + info strip below */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[22px] border overflow-hidden"
            style={{ borderColor: UI.border, opacity: 1 - i * 0.28 }}>
            {/* 16:9 video area */}
            <div className="animate-pulse" style={{ aspectRatio: "16/9", background: `rgba(15,23,42,${0.07 - i * 0.01})` }} />
            {/* Info strip */}
            <div className="px-3.5 py-3 space-y-1.5">
              <div className="h-2.5 rounded-full animate-pulse" style={{ width: "50%", background: "rgba(15,23,42,0.07)" }} />
              <div className="h-2 rounded-full animate-pulse" style={{ width: "75%", background: "rgba(15,23,42,0.04)" }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-2 py-10">
        <p className="text-sm font-semibold" style={{ color: "rgba(15,23,42,0.3)" }}>No templates yet</p>
        <p className="text-xs" style={{ color: "rgba(15,23,42,0.22)" }}>Switch to Admin view to render and save the first template</p>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function AdStudioPage() {
  // Brand settings (loaded once)
  const [brandName,     setBrandName]     = useState("Agentica");
  const [primaryColor,  setPrimaryColor]  = useState("#ffffff");
  const [accentColor,   setAccentColor]   = useState("#1d4ed8");

  const isAdmin = useIsAdmin();

  // View mode — only admins can switch. Non-admins are locked to "consumer".
  const [viewMode, setViewMode] = useState<"consumer" | "admin">("consumer");
  useEffect(() => {
    if (!isAdmin) { setViewMode("consumer"); return; }
    const stored = sessionStorage.getItem("adStudioView") as "consumer" | "admin" | null;
    if (stored) setViewMode(stored);
  }, [isAdmin]);

  // DB templates + active selection
  const [dbTemplates,    setDbTemplates]    = useState<DbTemplate[]>([]);
  const [dbLoading,      setDbLoading]      = useState(true);
  const [activeTemplate, setActiveTemplate] = useState<ActiveTemplate | null>(null);

  // Save-as-template state
  const [saveState,     setSaveState]     = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [templateName,  setTemplateName]  = useState("");

  // Upload
  const [imageFile,     setImageFile]     = useState<File | null>(null);
  const [imagePreview,  setImagePreview]  = useState<string | null>(null);
  const [imageUrl,      setImageUrl]      = useState<string | null>(null);
  const [uploading,     setUploading]     = useState(false);
  const [uploadStage,   setUploadStage]   = useState<"uploading" | "processing" | null>(null);
  const [uploadError,   setUploadError]   = useState<string | null>(null);
  const [dragOver,        setDragOver]        = useState(false);
  const [show3dSelector,  setShow3dSelector]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Form — keyed by slot.key, populated per template
  const [fields, setFields] = useState<Record<string, string>>({});

  // Base render
  const [baseJob,       setBaseJob]       = useState<RenderJob | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Variants
  const [variantJobs,   setVariantJobs]   = useState<Partial<Record<ToneKey, RenderJob>>>({});
  const variantPollRefs = useRef<Partial<Record<ToneKey, NodeJS.Timeout>>>({});

  // Load brand settings
  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => {
        if (d.brand_name)     setBrandName(d.brand_name);
        if (d.primary_color)  setPrimaryColor(d.primary_color);
        if (d.accent_color)   setAccentColor(d.accent_color);
      })
      .catch(() => {});
  }, []);

  // Fetch DB templates
  const fetchDbTemplates = useCallback(async () => {
    setDbLoading(true);
    try {
      const res  = await fetch("/api/agentica/templates");
      const data = await res.json();
      setDbTemplates(data.templates ?? []);
    } catch { /* silently fail */ }
    finally { setDbLoading(false); }
  }, []);

  useEffect(() => { fetchDbTemplates(); }, [fetchDbTemplates]);

  // Core template selection — seeds fields from slots, resets jobs
  function activateTemplate(t: ActiveTemplate) {
    setActiveTemplate(t);
    const seed: Record<string, string> = {};
    for (const slot of t.text_slots) seed[slot.key] = slot.placeholder;
    setFields(seed);
    setBaseJob(null);
    setVariantJobs({});
    setSaveState("idle");
    setTemplateName(t.name);
  }

  function selectDbTemplate(t: DbTemplate) {
    activateTemplate({
      sourceId:             t.id,
      compositionId:        t.composition_id,
      name:                 t.name,
      duration:             t.duration,
      accent:               t.accent_color,
      bg:                   t.bg_color,
      text_slots:           t.text_slots,
      videoUrl:             t.video_url,
      angle_hint:           t.angle_hint,
      background_video_url: t.background_video_url ?? null,
      overlay_config:       t.overlay_config       ?? null,
      duration_sec:         t.duration_sec         ?? null,
      ad_schema:            t.ad_schema            ?? null,
    });
  }


  // File handling
  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setUploadError("Please upload an image file (JPG, PNG, WEBP)."); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageUrl(null);
    setUploadError(null);
  }

  // Upload image to storage + background removal
  async function ensureUploaded(): Promise<string> {
    if (imageUrl) return imageUrl;
    if (!imageFile) throw new Error("No image selected");
    setUploading(true);
    setUploadStage("uploading");
    try {
      // Step 1: raw upload
      const form = new FormData();
      form.append("file", imageFile);
      form.append("folder", "ad-products");
      const upRes  = await fetch("/api/upload", { method: "POST", body: form });
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error ?? "Upload failed");
      const rawUrl = upData.url as string;

      // Step 2: background removal
      setUploadStage("processing");
      let finalUrl = rawUrl;
      try {
        const proc = await fetch("/api/product/process-image", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ image_url: rawUrl }),
        });
        if (proc.ok) {
          const procData = await proc.json();
          finalUrl = procData.processed_url as string;
        }
      } catch { /* fall through to raw URL */ }

      setImageUrl(finalUrl);
      return finalUrl;
    } finally {
      setUploading(false);
      setUploadStage(null);
    }
  }

  // Polling helper
  const startPolling = useCallback((
    renderId: string,
    bucketName: string,
    setJob: (updater: (prev: RenderJob) => RenderJob) => void,
    timerRef: { current: NodeJS.Timeout | null },
  ) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(async () => {
      try {
        const { status, outputUrl, progress, error: renderError } = await pollStatus(renderId, bucketName);
        if (status === "done") {
          if (timerRef.current) clearInterval(timerRef.current);
          setJob(prev => ({ ...prev, state: "done", outputUrl, progress: 1 }));
        } else if (status === "failed") {
          if (timerRef.current) clearInterval(timerRef.current);
          setJob(prev => ({ ...prev, state: "error", error: renderError ?? "Render failed — check server logs." }));
        } else {
          setJob(prev => ({ ...prev, state: "rendering", progress }));
        }
      } catch {
        if (timerRef.current) clearInterval(timerRef.current);
        setJob(prev => ({ ...prev, state: "error", error: "Status check failed" }));
      }
    }, 4000);
  }, []);

  // Derive normalised text values from fields for render calls
  function resolvedProps(overrideFields?: Record<string, string>) {
    const f = overrideFields ?? fields;
    const hook    = f.hook    ?? f.headline ?? "";
    const ctaText = f.ctaText ?? f.cta      ?? "";
    return { hook, headline: hook, subtext: f.subtext ?? "", cta: ctaText, ctaText };
  }

  // Save the completed base render as a reusable template in the DB
  async function handleSaveTemplate() {
    if (!activeTemplate || !baseJob?.outputUrl) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/agentica/templates", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:           templateName || activeTemplate.name,
          composition_id: activeTemplate.compositionId,
          video_url:      baseJob.outputUrl,
          duration:       activeTemplate.duration,
          accent_color:   activeTemplate.accent,
          bg_color:       activeTemplate.bg,
          description:    null,
          text_slots:     activeTemplate.text_slots,
          required_angle: activeTemplate.angle_hint,
          angle_hint:     activeTemplate.angle_hint,
        }),
      });
      if (!res.ok) { setSaveState("error"); return; }
      setSaveState("saved");
      fetchDbTemplates(); // refresh the grid
    } catch {
      setSaveState("error");
    }
  }

  // Delete a template (admin only — soft-deletes via API)
  async function handleDeleteTemplate(t: DbTemplate) {
    if (!window.confirm(`Delete "${t.name}"? This removes it from everyone's library.`)) return;
    try {
      await fetch("/api/agentica/templates", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: t.id }),
      });
      // Clear selection if the deleted template was active
      if (activeTemplate?.sourceId === t.id) setActiveTemplate(null);
      fetchDbTemplates();
    } catch { /* silently ignore */ }
  }

  // Generate base render
  async function handleGenerate() {
    if (!activeTemplate) return;
    setSaveState("idle");

    // ── AdMeta: inject consumer's product image into the stored schema ────────
    if (activeTemplate.compositionId === "AdMeta") {
      const { ad_schema } = activeTemplate;
      if (!ad_schema) return;
      try {
        const url = await ensureUploaded();
        const job: RenderJob = { renderId: "", bucketName: "", outputUrl: null, state: "starting", progress: 0, error: null };
        setBaseJob(job);
        const { renderId, bucketName } = await startAdMetaRender({ schema: ad_schema, productImageUrl: url });
        setBaseJob(prev => ({ ...(prev ?? job), renderId, bucketName }));
        startPolling(renderId, bucketName, (updater) => setBaseJob(prev => prev ? updater(prev) : prev), pollRef);
      } catch (err) {
        setBaseJob(prev => prev ? ({ ...prev, state: "error", error: (err as Error).message }) : null);
      }
      return;
    }

    // ── AdVideoOverlay: swap user's product into the copied reference video ──
    if (activeTemplate.compositionId === "AdVideoOverlay") {
      const { background_video_url, overlay_config, duration_sec } = activeTemplate;
      if (!background_video_url || !overlay_config) return;
      try {
        const url = await ensureUploaded();
        const job: RenderJob = { renderId: "", bucketName: "", outputUrl: null, state: "starting", progress: 0, error: null };
        setBaseJob(job);
        const { renderId, bucketName } = await startOverlayRender({
          backgroundVideoUrl: background_video_url,
          imageUrl:           url,
          overlayConfig:      overlay_config,
          durationSec:        duration_sec ?? 15,
        });
        setBaseJob(prev => ({ ...(prev ?? job), renderId, bucketName }));
        startPolling(renderId, bucketName, (updater) => setBaseJob(prev => prev ? updater(prev) : prev), pollRef);
      } catch (err) {
        setBaseJob(prev => prev ? ({ ...prev, state: "error", error: (err as Error).message }) : null);
      }
      return;
    }

    // ── Standard composition path ─────────────────────────────────────────────
    const rp = resolvedProps();
    if (!rp.hook || !rp.cta) return;
    try {
      const url = await ensureUploaded();
      const job: RenderJob = { renderId: "", bucketName: "", outputUrl: null, state: "starting", progress: 0, error: null };
      setBaseJob(job);
      const props = buildRenderProps(activeTemplate, fields, url, brandName, primaryColor, accentColor);
      const { renderId, bucketName } = await startRender({
        composition: activeTemplate.compositionId, imageUrl: url,
        headline: props.headline as string, subtext: props.subtext as string,
        cta: props.cta as string, brandName, primaryColor, accentColor,
      });
      setBaseJob(prev => ({ ...(prev ?? job), renderId, bucketName }));
      startPolling(renderId, bucketName, (updater) => setBaseJob(prev => prev ? updater(prev) : prev), pollRef);
    } catch (err) {
      setBaseJob(prev => prev ? ({ ...prev, state: "error", error: (err as Error).message }) : null);
    }
  }

  // Variant tone copy — overrides the key text fields with tone variants
  function variantCopy(tone: ToneKey): Record<string, string> {
    const base = resolvedProps();
    switch (tone) {
      case "urgency":      return { ...fields, hook: `Don't wait — ${base.hook}`,              headline: `Don't wait — ${base.hook}`,           subtext: "Limited time. Move now.",                   cta: "Get It Now",   ctaText: "Get It Now" };
      case "aspirational": return { ...fields, hook: `Imagine ${base.hook.toLowerCase()}`,      headline: `Imagine ${base.hook.toLowerCase()}`,  subtext: "The best version of your experience.",      cta: "Elevate Now",  ctaText: "Elevate Now" };
      case "social":       return { ...fields, hook: `Everyone's switching to this`,            headline: `Everyone's switching to this`,         subtext: base.hook,                                   cta: "Join Them",    ctaText: "Join Them" };
    }
  }

  // Generate a variant
  async function handleVariant(tone: ToneKey) {
    if (!activeTemplate || !imageUrl) return;
    const copy = variantCopy(tone);
    const job: RenderJob = { renderId: "", bucketName: "", outputUrl: null, state: "starting", progress: 0, error: null };
    setVariantJobs(prev => ({ ...prev, [tone]: job }));
    try {
      const props = buildRenderProps(activeTemplate, copy, imageUrl, brandName, primaryColor, accentColor);
      const { renderId, bucketName } = await startRender({
        composition: activeTemplate.compositionId, imageUrl,
        headline: props.headline as string, subtext: props.subtext as string,
        cta: props.cta as string, brandName, primaryColor, accentColor,
      });
      setVariantJobs(prev => ({ ...prev, [tone]: { ...job, renderId, bucketName } }));
      const ref = { current: variantPollRefs.current[tone] ?? null };
      startPolling(renderId, bucketName, (updater) => {
        setVariantJobs(prev => {
          const existing = prev[tone];
          return { ...prev, [tone]: existing ? updater(existing) : existing };
        });
      }, ref);
      variantPollRefs.current[tone] = ref.current!;
    } catch (err) {
      setVariantJobs(prev => ({ ...prev, [tone]: { ...job, state: "error", error: (err as Error).message } }));
    }
  }

  const selected    = activeTemplate;   // alias — JSX uses selected.accent / .text_slots / .name
  const rp          = resolvedProps();
  const isOverlay   = activeTemplate?.compositionId === "AdVideoOverlay";
  const isAdMeta    = activeTemplate?.compositionId === "AdMeta";
  const canGenerate = !!activeTemplate && !!imagePreview && !uploading &&
    (isOverlay || isAdMeta || (!!rp.hook && !!rp.cta));
  const baseRendering = baseJob?.state === "starting" || baseJob?.state === "rendering";
  const baseDone = baseJob?.state === "done";

  return (
    <div className="min-h-screen" style={{ background: UI.bg }}>
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: UI.text }}>Ad Studio</h1>
            <p className="text-sm mt-1" style={{ color: UI.sub }}>
              {viewMode === "admin"
                ? "Admin — render compositions, save templates, manage the library."
                : "Pick a template, drop in your product image, hit Render."}
            </p>
          </div>

          {/* Admin / Consumer toggle — admin only */}
          {isAdmin && (
            <div className="flex items-center gap-1 p-1 rounded-full border shrink-0"
              style={{ borderColor: UI.border, background: UI.panel }}>
              {(["consumer", "admin"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => { setViewMode(mode); sessionStorage.setItem("adStudioView", mode); }}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all"
                  style={{
                    background: viewMode === mode ? UI.accent : "transparent",
                    color:      viewMode === mode ? "#fff" : UI.sub,
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Reference Analyzer — admin only ───────────────────────────────── */}
        {isAdmin && viewMode === "admin" && <ReferenceAnalyzer onTemplateSaved={fetchDbTemplates} />}


        {/* ── Template grid ─────────────────────────────────────────────────── */}
        <section>

          {/* Loading skeleton */}
          {dbLoading && (
            <div className="flex items-center gap-2 py-10" style={{ color: UI.muted }}>
              <CircleNotch size={16} className="animate-spin" />
              <span className="text-xs">Loading templates…</span>
            </div>
          )}

          {/* ── CONSUMER: screensaver video cards, or skeleton placeholder ─────── */}
          {viewMode === "consumer" && !dbLoading && (
            dbTemplates.length === 0
              ? <TemplatePlaceholder />
              : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {dbTemplates.map(t => (
                    <VideoTemplateCard key={t.id} t={t} activeId={activeTemplate?.sourceId ?? null} onSelect={selectDbTemplate} onDelete={isAdmin ? handleDeleteTemplate : undefined} portrait={false} />
                  ))}
                </div>
          )}

          {/* ── ADMIN: portrait video cards, or empty message ────────────────── */}
          {isAdmin && viewMode === "admin" && !dbLoading && (
            dbTemplates.length > 0
              ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {dbTemplates.map(t => (
                    <VideoTemplateCard key={t.id} t={t} activeId={activeTemplate?.sourceId ?? null} onSelect={selectDbTemplate} onDelete={handleDeleteTemplate} portrait={true} />
                  ))}
                </div>
              : <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: UI.muted }}>
                  <FilmSlate size={28} weight="duotone" style={{ color: UI.muted }} />
                  <p className="text-sm font-semibold">No templates yet</p>
                  <p className="text-xs text-center max-w-xs">
                    Use the &ldquo;Create Template from Reference Ad&rdquo; form above to add the first one.
                  </p>
                </div>
          )}
        </section>

        {/* ── Steps 2+3 appear after template is picked ─────────────────────── */}
        {selected && (
          <>
            {/* Step 2: Upload + form */}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">

              {/* Upload zone */}
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: UI.muted }}>
                    Step 2 — Your Product Image
                  </p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${selected.accent}12`, color: selected.accent }}>
                    replaces the hero
                  </span>
                </div>

                {/* Angle hint from template */}
                {selected.angle_hint && (
                  <div className="flex items-start gap-2 mb-3 rounded-[12px] px-3 py-2.5"
                    style={{ background: `${selected.accent}08`, border: `1px solid ${selected.accent}20` }}>
                    <Sparkle size={13} weight="fill" className="shrink-0 mt-0.5" style={{ color: selected.accent }} />
                    <p className="text-[11px] leading-relaxed" style={{ color: UI.sub }}>
                      <span className="font-semibold" style={{ color: UI.text }}>Best shot: </span>
                      {selected.angle_hint}
                    </p>
                  </div>
                )}

                <input
                  ref={fileRef} type="file" accept="image/*"
                  className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                <div
                  className="relative rounded-[22px] border-2 border-dashed overflow-hidden cursor-pointer transition-all"
                  style={{
                    borderColor: dragOver ? selected.accent : (imagePreview ? selected.accent : UI.border),
                    background:  dragOver ? `${selected.accent}08` : (imagePreview ? "#000" : UI.panel),
                    minHeight:   260,
                  }}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                >
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePreview} alt="Product" className="w-full h-full object-contain" style={{ maxHeight: 280 }} />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: `${selected.accent}12` }}>
                        <UploadSimple size={22} style={{ color: selected.accent }} />
                      </div>
                      <div className="text-center px-4">
                        <p className="text-sm font-semibold" style={{ color: UI.text }}>Drop your product image here</p>
                        <p className="text-xs mt-1" style={{ color: UI.sub }}>
                          Your image replaces the hero in &ldquo;{selected.name}&rdquo;
                        </p>
                        <p className="text-[10px] mt-1" style={{ color: UI.muted }}>JPG, PNG, WEBP · Click or drag</p>
                      </div>
                    </div>
                  )}
                  {imagePreview && imageUrl && (
                    <button
                      className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all"
                      style={{ background: "rgba(29,78,216,0.85)", backdropFilter: "blur(6px)" }}
                      onClick={e => { e.stopPropagation(); setShow3dSelector(true); }}
                    >
                      <span style={{ fontSize: 12 }}>🔄</span> 3D Angles
                    </button>
                  )}
                  {imagePreview && (
                    <button
                      className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: "rgba(0,0,0,0.55)" }}
                      onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null); setImageUrl(null); setShow3dSelector(false); }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {uploadError && (
                  <p className="text-xs mt-2" style={{ color: "#dc2626" }}>{uploadError}</p>
                )}
              </div>

              {/* Form — only shown for standard (non-overlay, non-AdMeta) templates */}
              <div>
                {(isOverlay || isAdMeta) ? (
                  <div className="rounded-[22px] border p-5 flex flex-col items-center justify-center gap-2 text-center"
                    style={{ borderColor: UI.border, background: UI.panel, minHeight: 160 }}>
                    <p className="text-sm font-semibold" style={{ color: UI.text }}>No copy needed</p>
                    <p className="text-xs" style={{ color: UI.sub }}>
                      This template copies the original ad exactly — text is baked into the reference video.
                      Only your product image changes.
                    </p>
                  </div>
                ) : <>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: UI.muted }}>
                  Step 3 — Ad Copy
                </p>
                <div className="rounded-[22px] border p-5 space-y-4" style={{ borderColor: UI.border, background: UI.panel }}>

                  {selected.text_slots.map(slot => (
                    <div key={slot.key}>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <label className="text-xs font-semibold" style={{ color: UI.sub }}>{slot.label}</label>
                        <span className="text-[10px]" style={{ color: (fields[slot.key] ?? "").length > slot.maxChars ? "#dc2626" : UI.muted }}>
                          {(fields[slot.key] ?? "").length}/{slot.maxChars}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={fields[slot.key] ?? ""}
                        onChange={e => setFields(prev => ({ ...prev, [slot.key]: e.target.value }))}
                        placeholder={slot.placeholder}
                        maxLength={slot.maxChars + 10}
                        className="w-full rounded-[14px] border px-3 py-2.5 text-sm outline-none transition"
                        style={{ borderColor: UI.border, background: UI.bg, color: UI.text }}
                        onFocus={e => (e.currentTarget.style.borderColor = selected.accent)}
                        onBlur={e => (e.currentTarget.style.borderColor = UI.border)}
                      />
                      <p className="text-[10px] mt-1" style={{ color: UI.muted }}>{slot.hint}</p>
                    </div>
                  ))}

                  {/* Brand + colours (compact) */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-3">
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: UI.sub }}>Brand Name</label>
                      <input
                        type="text" value={brandName}
                        onChange={e => setBrandName(e.target.value)}
                        className="w-full rounded-[14px] border px-3 py-2.5 text-sm outline-none"
                        style={{ borderColor: UI.border, background: UI.bg, color: UI.text }}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: UI.sub }}>Primary</label>
                      <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                        className="w-full h-10 rounded-[12px] border cursor-pointer"
                        style={{ borderColor: UI.border }} />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: UI.sub }}>Accent</label>
                      <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                        className="w-full h-10 rounded-[12px] border cursor-pointer"
                        style={{ borderColor: UI.border }} />
                    </div>
                    <div className="col-span-1 flex flex-col">
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: UI.sub }}>Preview</label>
                      <div className="flex-1 rounded-[12px] border overflow-hidden" style={{ borderColor: UI.border }}>
                        <div style={{ height: "50%", background: primaryColor }} />
                        <div style={{ height: "50%", background: accentColor }} />
                      </div>
                    </div>
                  </div>
                </div>
                </>}
              </div>
            </section>

            {/* Generate button */}
            <section>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || baseRendering}
                className="flex items-center gap-3 px-8 py-4 rounded-[18px] text-base font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: canGenerate && !baseRendering ? selected.accent : `${selected.accent}55`,
                  color: "#ffffff",
                  boxShadow: canGenerate && !baseRendering ? `0 12px 32px ${selected.accent}44` : "none",
                }}
              >
                {uploadStage === "uploading" ? (
                  <><CircleNotch size={18} className="animate-spin" /> Uploading…</>
                ) : uploadStage === "processing" ? (
                  <><CircleNotch size={18} className="animate-spin" /> Removing background…</>
                ) : uploading ? (
                  <><CircleNotch size={18} className="animate-spin" /> Processing…</>
                ) : baseRendering ? (
                  <><CircleNotch size={18} className="animate-spin" /> Rendering {selected.name}…</>
                ) : (
                  <><FilmSlate size={18} weight="fill" /> Render &ldquo;{selected.name}&rdquo;</>
                )}
              </button>
              {!imagePreview && (
                <p className="text-xs mt-2" style={{ color: UI.muted }}>Upload a product image first</p>
              )}
            </section>

            {/* Base render output */}
            {baseJob && (
              <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: UI.muted }}>Render Output</p>
                <div className="max-w-sm space-y-3">
                  <RenderCard job={baseJob} label={selected!.name} />

                  {/* ── Save as Template — admin only ── */}
                  {isAdmin && viewMode === "admin" && baseDone && baseJob.outputUrl && (
                    <div className="rounded-[18px] border p-4 space-y-3"
                      style={{ borderColor: `${selected!.accent}40`, background: `${selected!.accent}06` }}>
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: selected!.accent }}>
                        Save as Template
                      </p>
                      <p className="text-[11px] leading-relaxed" style={{ color: UI.sub }}>
                        This render becomes a reusable video card in the template library.
                      </p>

                      {saveState !== "saved" && (
                        <input
                          type="text"
                          value={templateName}
                          onChange={e => setTemplateName(e.target.value)}
                          placeholder="Template name…"
                          className="w-full rounded-[12px] border px-3 py-2 text-sm outline-none"
                          style={{ borderColor: UI.border, background: UI.panel, color: UI.text }}
                        />
                      )}

                      {saveState === "saved" ? (
                        <div className="flex items-center gap-2 py-1">
                          <CheckCircle size={16} weight="fill" style={{ color: "#15803d" }} />
                          <span className="text-sm font-semibold" style={{ color: "#15803d" }}>Saved to template library</span>
                        </div>
                      ) : (
                        <button
                          onClick={handleSaveTemplate}
                          disabled={saveState === "saving" || !templateName.trim()}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-sm font-bold transition disabled:opacity-50"
                          style={{ background: selected!.accent, color: "#fff" }}
                        >
                          {saveState === "saving" ? (
                            <><CircleNotch size={15} className="animate-spin" /> Saving…</>
                          ) : (
                            <><FilmSlate size={15} weight="fill" /> Save as Template</>
                          )}
                        </button>
                      )}

                      {saveState === "error" && (
                        <p className="text-xs" style={{ color: "#dc2626" }}>Save failed — check console.</p>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Variants — only show after base is done */}
            {baseDone && (
              <section className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: UI.muted }}>Variants</p>
                  <p className="text-sm mt-1" style={{ color: UI.sub }}>
                    Same template, same image. Different tone. Each is a fresh render — no AI generation needed.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {VARIANT_TONES.map(({ key, label, description }) => {
                    const copy = variantCopy(key);
                    const job  = variantJobs[key];
                    return (
                      <div key={key} className="rounded-[22px] border p-4 space-y-3"
                        style={{ borderColor: UI.border, background: UI.panel }}>
                        <div>
                          <p className="text-sm font-bold" style={{ color: UI.text }}>{label}</p>
                          <p className="text-xs mt-0.5" style={{ color: UI.sub }}>{description}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold leading-snug" style={{ color: UI.text }}>
                            &ldquo;{copy.hook ?? copy.headline}&rdquo;
                          </p>
                          <p className="text-[11px] italic" style={{ color: UI.sub }}>{copy.subtext}</p>
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: `${selected.accent}14`, color: selected.accent }}>
                            {copy.cta ?? copy.ctaText} →
                          </span>
                        </div>

                        {job ? (
                          <RenderCard job={job} label={label} />
                        ) : (
                          <button
                            onClick={() => handleVariant(key)}
                            className="flex items-center gap-2 w-full justify-center py-2.5 rounded-[14px] text-xs font-semibold transition"
                            style={{ background: `${selected.accent}10`, color: selected.accent }}
                          >
                            <Sparkle size={14} weight="fill" />
                            Render {label}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* Empty state — no template selected */}
        {!selected && !dbLoading && dbTemplates.length > 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: UI.muted }}>
            <Play size={36} weight="duotone" />
            <p className="text-sm">Select a template above to get started</p>
          </div>
        )}

      </div>

      {/* 3D angle selector modal */}
      {show3dSelector && imageUrl && (
        <ProductAngleSelector
          cleanImageUrl={imageUrl}
          onAngleCapture={capturedUrl => {
            setImageUrl(capturedUrl);
            setImagePreview(capturedUrl);
            setShow3dSelector(false);
          }}
          onClose={() => setShow3dSelector(false)}
        />
      )}
    </div>
  );
}
