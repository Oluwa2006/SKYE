"use client";

import { useState, useEffect, useRef } from "react";
import {
  FilmStrip, DownloadSimple, CircleNotch, WarningCircle, ArrowClockwise, CaretRight,
  Sparkle, MagicWand, Dna, Plus, CheckCircle,
  Lightning, Stack, ShoppingBag, Fire, Star, FilmSlate, ChartBar,
  DeviceMobile, ArrowsLeftRight, Video, type Icon,
} from "@phosphor-icons/react";
import { STYLE_PRESETS, type StylePreset } from "@/lib/style-presets";

// ─── Template definitions ──────────────────────────────────────────────────────
const TEMPLATES: {
  id: string; name: string; description: string;
  icon: Icon; color: string; accent: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
}[] = [
  {
    id: "ProductSpotlight",
    name: "Product Spotlight",
    description: "Hero shot with animated headline and CTA",
    icon: ShoppingBag,
    color: "#6d28d9",
    accent: "#a78bfa",
    fields: [
      { key: "headline",    label: "Headline",    placeholder: "New Arrival" },
      { key: "subtext",     label: "Subtext",     placeholder: "Fresh, bold, and made for you." },
      { key: "cta",         label: "CTA Button",  placeholder: "Shop Now" },
      { key: "imageUrl",    label: "Image URL",   placeholder: "https://... (optional)" },
    ],
  },
  {
    id: "LimitedOffer",
    name: "Limited Offer",
    description: "Bold urgency ad — flash sales, deals",
    icon: Fire,
    color: "#991b1b",
    accent: "#ef4444",
    fields: [
      { key: "offerText",     label: "Offer Text",    placeholder: "50% OFF" },
      { key: "subtext",       label: "Subtext",       placeholder: "This weekend only." },
      { key: "cta",           label: "CTA Button",    placeholder: "Claim Deal" },
      { key: "urgencyLabel",  label: "Urgency Label", placeholder: "48 hrs left" },
    ],
  },
  {
    id: "SocialProof",
    name: "Social Proof",
    description: "Customer quote with star rating",
    icon: Star,
    color: "#065f46",
    accent: "#34d399",
    fields: [
      { key: "quote",        label: "Quote",         placeholder: "Honestly the best I've ever tried." },
      { key: "customerName", label: "Customer Name", placeholder: "Sarah M." },
      { key: "rating",       label: "Star Rating",   placeholder: "5", type: "number" },
    ],
  },
  {
    id: "ReelOpener",
    name: "Reel Opener",
    description: "3-second branded intro for your reels",
    icon: FilmSlate,
    color: "#1e3a5f",
    accent: "#60a5fa",
    fields: [
      { key: "tagline", label: "Tagline", placeholder: "Made different" },
    ],
  },
  {
    id: "StatsDrop",
    name: "Stats Drop",
    description: "Numbers that build credibility",
    icon: ChartBar,
    color: "#0f172a",
    accent: "#818cf8",
    fields: [
      { key: "headline",   label: "Headline",          placeholder: "The numbers speak." },
      { key: "stat1val",   label: "Stat 1 Value",       placeholder: "10K+" },
      { key: "stat1label", label: "Stat 1 Label",       placeholder: "Happy customers" },
      { key: "stat2val",   label: "Stat 2 Value",       placeholder: "4.9★" },
      { key: "stat2label", label: "Stat 2 Label",       placeholder: "Avg rating" },
      { key: "stat3val",   label: "Stat 3 Value",       placeholder: "3yrs" },
      { key: "stat3label", label: "Stat 3 Label",       placeholder: "In business" },
      { key: "stat4val",   label: "Stat 4 Value",       placeholder: "#1" },
      { key: "stat4label", label: "Stat 4 Label",       placeholder: "In our city" },
    ],
  },
  {
    id: "StoryCTA",
    name: "Story CTA",
    description: "Full-screen gradient with bold CTA",
    icon: DeviceMobile,
    color: "#6d28d9",
    accent: "#7c3aed",
    fields: [
      { key: "headline", label: "Headline", placeholder: "You deserve the best." },
      { key: "subtext",  label: "Subtext",  placeholder: "Come see what everyone's talking about." },
      { key: "cta",      label: "CTA",      placeholder: "Visit Us Today" },
    ],
  },
  {
    id: "BeforeAfter",
    name: "Before & After",
    description: "Split-screen reveal with text",
    icon: ArrowsLeftRight,
    color: "#374151",
    accent: "#6d28d9",
    fields: [
      { key: "beforeText",  label: "Before Text",  placeholder: "Settling for less" },
      { key: "afterText",   label: "After Text",   placeholder: "The real deal" },
      { key: "beforeLabel", label: "Before Label", placeholder: "Before" },
      { key: "afterLabel",  label: "After Label",  placeholder: "After" },
    ],
  },
  {
    id: "UGCFrame",
    name: "UGC Frame",
    description: "Branded frame to repost creator content",
    icon: Video,
    color: "#be185d",
    accent: "#f472b6",
    fields: [
      { key: "creatorHandle", label: "Creator Handle", placeholder: "foodiename" },
      { key: "caption",       label: "Caption",        placeholder: "Can't believe how good this was" },
      { key: "imageUrl",      label: "Image URL",      placeholder: "https://... (optional)" },
    ],
  },
];

function buildInputProps(templateId: string, form: Record<string, string>, brandName: string, primaryColor: string, accentColor: string) {
  const base = { brandName, primaryColor, accentColor };
  if (templateId === "StatsDrop") {
    return {
      ...base,
      headline: form.headline || "The numbers speak.",
      stats: [
        { value: form.stat1val || "10K+", label: form.stat1label || "Customers" },
        { value: form.stat2val || "4.9★", label: form.stat2label || "Rating" },
        { value: form.stat3val || "3yrs", label: form.stat3label || "Experience" },
        { value: form.stat4val || "#1",   label: form.stat4label || "In the city" },
      ],
    };
  }
  return { ...base, ...form };
}

type RenderState = "idle" | "starting" | "rendering" | "done" | "error";

// ─── Agentica types ────────────────────────────────────────────────────────────
type VariationStrength = "low" | "medium" | "high";
type TeamRole = "owner" | "admin" | "member";
type ViewerMode = "admin" | "consumer";

const REF_CATEGORIES = ["all", "cinematic", "lifestyle", "product", "text-forward", "energetic"] as const;
type RefCategory = typeof REF_CATEGORIES[number];

interface ReferenceVideo {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  style_category: string;
  engine: string;
  prompt: Record<string, string> | null;
  tags: string[];
}

// ─── Reference Selector ────────────────────────────────────────────────────────
function ReferenceSelector({
  selected,
  onSelect,
  selectedPreset,
  onSelectPreset,
  canManage,
}: {
  selected: ReferenceVideo | null;
  onSelect: (ref: ReferenceVideo | null) => void;
  selectedPreset: StylePreset | null;
  onSelectPreset: (preset: StylePreset | null) => void;
  canManage: boolean;
}) {
  const [refs, setRefs]               = useState<ReferenceVideo[]>([]);
  const [loading, setLoading]         = useState(true);
  const [category, setCategory]       = useState<RefCategory>("all");
  const [showAdd, setShowAdd]         = useState(false);
  const [addForm, setAddForm]         = useState({ title: "", video_url: "", thumbnail_url: "", style_category: "cinematic", engine: "higgsfield" });
  const [adding, setAdding]           = useState(false);
  const [addError, setAddError]       = useState<string | null>(null);
  const [hoveredId, setHoveredId]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = category === "all" ? "/api/reference-library" : `/api/reference-library?category=${category}`;
    fetch(url)
      .then(r => r.json())
      .then(d => { if (!cancelled) { setRefs(d.references ?? []); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category]);

  async function handleAdd() {
    if (!addForm.title || !addForm.video_url) return;
    setAdding(true);
    setAddError(null);
    try {
      const res  = await fetch("/api/reference-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Failed to add reference."); return; }
      setRefs(prev => [data.reference, ...prev]);
      setShowAdd(false);
      setAddForm({ title: "", video_url: "", thumbnail_url: "", style_category: "cinematic", engine: "higgsfield" });
    } catch { setAddError("Unable to add reference right now."); }
    finally { setAdding(false); }
  }

  const ENGINE_COLOR: Record<string, string> = {
    higgsfield: "#6d28d9",
    kling:      "#0369a1",
    pika:       "#be185d",
  };

  return (
    <div className="rounded-[30px] border p-6 space-y-4" style={{ background: VARIANT_UI.panel, borderColor: VARIANT_UI.border }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: VARIANT_UI.muted }}>
            Style Reference
          </p>
          <h3 className="text-xl font-semibold mt-1" style={{ color: VARIANT_UI.text }}>
            Anchor visual style
          </h3>
          <p className="text-xs mt-1 leading-5" style={{ color: VARIANT_UI.sub }}>
            Pick a reference video to lock the generation style. Optional — skip to use engine defaults.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selected && (
            <button
              onClick={() => onSelect(null)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition"
              style={{ background: VARIANT_UI.dangerSoft, color: VARIANT_UI.danger }}
            >
              Clear
            </button>
          )}
          {canManage && (
            <button
              onClick={() => setShowAdd(v => !v)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition"
              style={{
                background: showAdd ? VARIANT_UI.accent : VARIANT_UI.accentSoft,
                color: showAdd ? "#ffffff" : VARIANT_UI.text,
              }}
            >
              + Add
            </button>
          )}
        </div>
      </div>

      {/* Selected reference banner */}
      {selected && (
        <div
          className="flex items-center gap-3 rounded-[22px] border px-4 py-3"
          style={{ background: VARIANT_UI.successSoft, borderColor: "rgba(21,128,61,0.2)" }}
        >
          {selected.thumbnail_url ? (
            <img src={selected.thumbnail_url} alt={selected.title} className="w-10 h-10 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white text-xs font-bold"
              style={{ background: ENGINE_COLOR[selected.engine] ?? "#6b7280" }}>
              {selected.engine.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight" style={{ color: VARIANT_UI.success }}>{selected.title}</p>
            <p className="text-xs mt-0.5 capitalize" style={{ color: VARIANT_UI.sub }}>{selected.style_category} · {selected.engine}</p>
          </div>
          <CheckCircle size={16} weight="fill" className="shrink-0 ml-auto" style={{ color: VARIANT_UI.success }} />
        </div>
      )}

      {/* Add form */}
      {canManage && showAdd && (
        <div className="rounded-[22px] border p-4 space-y-3" style={{ borderColor: VARIANT_UI.border, background: VARIANT_UI.panelSub }}>
          {[
            { key: "title",         label: "Title",         placeholder: "Cinematic slow zoom warm tones" },
            { key: "video_url",     label: "Video URL",     placeholder: "https://... (.mp4)" },
            { key: "thumbnail_url", label: "Thumbnail URL", placeholder: "https://... (.jpg, optional)" },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[11px] font-medium block mb-1" style={{ color: VARIANT_UI.text }}>{f.label}</label>
              <input
                value={addForm[f.key as keyof typeof addForm]}
                onChange={e => setAddForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                style={{ background: "#ffffff", borderColor: VARIANT_UI.border, color: VARIANT_UI.text }}
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: VARIANT_UI.text }}>Category</label>
              <select value={addForm.style_category} onChange={e => setAddForm(p => ({ ...p, style_category: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                style={{ background: "#ffffff", borderColor: VARIANT_UI.border, color: VARIANT_UI.text }}>
                {["cinematic","lifestyle","product","text-forward","energetic"].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium block mb-1" style={{ color: VARIANT_UI.text }}>Engine</label>
              <select value={addForm.engine} onChange={e => setAddForm(p => ({ ...p, engine: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                style={{ background: "#ffffff", borderColor: VARIANT_UI.border, color: VARIANT_UI.text }}>
                {["higgsfield","kling","pika"].map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          {addError && <p className="text-xs" style={{ color: VARIANT_UI.danger }}>{addError}</p>}
          <button
            onClick={handleAdd}
            disabled={adding || !addForm.title || !addForm.video_url}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
            style={{ background: VARIANT_UI.accent, color: "#ffffff" }}
          >
            {adding ? "Saving..." : "Save Reference"}
          </button>
        </div>
      )}

      {/* Quick Styles */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-2" style={{ color: VARIANT_UI.muted }}>
          Quick Styles
        </p>
        <div className="grid grid-cols-5 gap-2">
          {STYLE_PRESETS.map(preset => {
            const isActive = selectedPreset?.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  onSelectPreset(isActive ? null : preset);
                  if (!isActive) onSelect(null); // deselect reference when picking preset
                }}
                title={preset.description}
                className="flex flex-col items-center gap-1.5 rounded-[18px] border p-3 text-center transition"
                style={{
                  background:   isActive ? `${preset.accent}14` : VARIANT_UI.panelSub,
                  borderColor:  isActive ? `${preset.accent}55` : VARIANT_UI.border,
                  boxShadow:    isActive ? `0 4px 14px ${preset.accent}22` : "none",
                }}
              >
                <span className="text-xl leading-none">{preset.icon}</span>
                <p className="text-[10px] font-semibold leading-tight" style={{ color: isActive ? preset.accent : VARIANT_UI.text }}>
                  {preset.name.split(" ")[0]}
                </p>
                {isActive && (
                  <CheckCircle size={10} weight="fill" style={{ color: preset.accent }} />
                )}
              </button>
            );
          })}
        </div>
        {selectedPreset && (
          <div
            className="mt-2 flex items-center gap-2 rounded-[14px] border px-3 py-2"
            style={{ background: `${selectedPreset.accent}0e`, borderColor: `${selectedPreset.accent}33` }}
          >
            <span className="text-sm">{selectedPreset.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold leading-tight" style={{ color: selectedPreset.accent }}>{selectedPreset.name}</p>
              <p className="text-[10px] mt-0.5" style={{ color: VARIANT_UI.sub }}>{selectedPreset.description} · {selectedPreset.engine}</p>
            </div>
            <button
              onClick={() => onSelectPreset(null)}
              className="text-[10px] font-semibold shrink-0"
              style={{ color: VARIANT_UI.muted }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5">
        {REF_CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition"
            style={{
              background: category === c ? VARIANT_UI.accent : VARIANT_UI.accentSoft,
              color:      category === c ? "#ffffff" : VARIANT_UI.text,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <CircleNotch size={18} className="animate-spin" style={{ color: VARIANT_UI.muted }} />
        </div>
      ) : refs.length === 0 ? (
        <div className="rounded-[22px] border p-6 text-center" style={{ borderColor: VARIANT_UI.border, background: VARIANT_UI.panelSub }}>
          <FilmStrip size={24} weight="duotone" className="mx-auto mb-2" style={{ color: VARIANT_UI.muted }} />
          <p className="text-sm font-medium" style={{ color: VARIANT_UI.text }}>No references yet</p>
          <p className="text-xs mt-1" style={{ color: VARIANT_UI.sub }}>
            {canManage ? "Use the + Add button to upload your first reference video." : "An admin needs to add reference videos first."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {refs.map(ref => {
            const isSelected = selected?.id === ref.id;
            const isHovered  = hoveredId === ref.id;
            return (
              <button
                key={ref.id}
                onClick={() => onSelect(isSelected ? null : ref)}
                onMouseEnter={() => setHoveredId(ref.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="text-left rounded-[22px] border overflow-hidden transition"
                style={{
                  borderColor: isSelected ? "rgba(17,17,17,0.3)" : VARIANT_UI.border,
                  background:  isSelected ? VARIANT_UI.accentSoft : "#ffffff",
                  boxShadow:   isSelected || isHovered ? "0 8px 24px rgba(17,17,17,0.08)" : "none",
                  transform:   isHovered && !isSelected ? "translateY(-1px)" : "none",
                }}
              >
                {/* Thumbnail */}
                <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
                  {ref.thumbnail_url ? (
                    <img src={ref.thumbnail_url} alt={ref.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: `${ENGINE_COLOR[ref.engine] ?? "#6b7280"}18` }}>
                      <FilmStrip size={24} weight="duotone" style={{ color: ENGINE_COLOR[ref.engine] ?? "#6b7280" }} />
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "rgba(17,17,17,0.35)" }}>
                      <CheckCircle size={28} weight="fill" color="#ffffff" />
                    </div>
                  )}
                  <span
                    className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                    style={{ background: ENGINE_COLOR[ref.engine] ?? "#6b7280" }}
                  >
                    {ref.engine}
                  </span>
                </div>
                {/* Info */}
                <div className="px-3 py-2.5">
                  <p className="text-xs font-semibold leading-tight" style={{ color: VARIANT_UI.text }}>{ref.title}</p>
                  <p className="text-[10px] mt-1 capitalize" style={{ color: VARIANT_UI.sub }}>{ref.style_category}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface BaseAd {
  id: string;
  title: string;
  hook: string;
  script: string;
  cta: string;
  ad_type?: string | null;
  angle?: string | null;
  video_url?: string | null;
  style_category?: string | null;
  engine?: string | null;
  created_at: string;
}

interface VariantOutput {
  id: string;
  hook: string;
  script: string;
  cta: string;
  similarity_score: number;
  sibling_similarity?: number;
  status: string;
  videoTaskId?: string | null;
  videoStatus?: "none" | "processing" | "ready" | "failed" | null;
  videoUrl?: string | null;
}

// ─── Video Generate Button ─────────────────────────────────────────────────────
function VideoGenerateButton({
  variant,
  referenceId,
  presetId,
  styleCategory,
  brandName,
  primaryColor,
  accentColor,
  onVideoReady,
}: {
  variant: VariantOutput;
  referenceId: string | null;
  presetId: string | null;
  styleCategory: string;
  brandName: string;
  primaryColor: string;
  accentColor: string;
  onVideoReady: (variantId: string, videoUrl: string) => void;
}) {
  const [loading, setLoading]       = useState(false);
  const [taskId,  setTaskId]        = useState<string | null>(variant.videoTaskId ?? null);
  const [vStatus, setVStatus]       = useState<string>(variant.videoStatus ?? "none");
  const [videoUrl, setVideoUrl]     = useState<string | null>(variant.videoUrl ?? null);
  const [error,   setError]         = useState<string | null>(null);
  const [rendering, setRendering]   = useState(false);
  const [renderId, setRenderId]     = useState<string | null>(null);
  const [bucketName, setBucketName] = useState<string | null>(null);
  const [finalUrl,  setFinalUrl]    = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const renderRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll render progress
  useEffect(() => {
    if (!renderId || !bucketName || finalUrl) return;
    renderRef.current = setInterval(async () => {
      try {
        const url = `/api/agentica/render-status?render_id=${encodeURIComponent(renderId)}&bucket_name=${encodeURIComponent(bucketName)}&variant_id=${variant.id}`;
        const res  = await fetch(url);
        const data = await res.json();
        if (data.status === "done") {
          clearInterval(renderRef.current!);
          setFinalUrl(data.outputUrl);
          setRendering(false);
          setRenderProgress(1);
        } else if (data.status === "failed") {
          clearInterval(renderRef.current!);
          setRendering(false);
          setError("Render failed. Try again.");
        } else {
          setRenderProgress(data.progress ?? 0);
        }
      } catch { /* keep polling */ }
    }, 5000);
    return () => { if (renderRef.current) clearInterval(renderRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderId, bucketName]);

  async function handleRender() {
    if (!videoUrl) return;
    setRendering(true);
    setError(null);
    try {
      const res  = await fetch("/api/agentica/render-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant_id:    variant.id,
          video_url:     videoUrl,
          hook:          variant.hook,
          subtext:       variant.script || undefined,
          cta:           variant.cta,
          brand_name:    brandName,
          primary_color: primaryColor,
          accent_color:  accentColor,
          style_category: styleCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Render failed."); setRendering(false); return; }
      setRenderId(data.render_id);
      setBucketName(data.bucket_name);
    } catch { setError("Unable to start render."); setRendering(false); }
  }

  // Start polling when we have a taskId and status is processing
  useEffect(() => {
    if (!taskId || vStatus !== "processing") return;
    pollRef.current = setInterval(async () => {
      try {
        const url = `/api/agentica/video-status?taskId=${encodeURIComponent(taskId)}&variant_id=${variant.id}`;
        const res  = await fetch(url);
        const data = await res.json();
        if (data.status === "succeed") {
          clearInterval(pollRef.current!);
          setVStatus("ready");
          setVideoUrl(data.videoUrl);
          onVideoReady(variant.id, data.videoUrl);
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!);
          setVStatus("failed");
          setError("Video generation failed. Try again.");
        }
      } catch { /* keep polling */ }
    }, 6000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, vStatus]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/agentica/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant_id:   variant.id,
          reference_id: referenceId ?? undefined,
          preset_id:    presetId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to start video generation."); return; }
      setTaskId(data.task_id);
      setVStatus("processing");
    } catch { setError("Unable to start video generation."); }
    finally { setLoading(false); }
  }

  if (vStatus === "ready" && videoUrl) {
    return (
      <div className="mt-5 space-y-3">
        {/* Raw AI clip */}
        <video
          src={videoUrl}
          controls
          playsInline
          className="w-full rounded-[18px] bg-black"
          style={{ maxHeight: 280, aspectRatio: "9/16", objectFit: "cover" }}
        />

        {/* Final rendered ad */}
        {finalUrl ? (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-center" style={{ color: VARIANT_UI.muted }}>Final Ad</p>
            <video
              src={finalUrl}
              controls
              playsInline
              className="w-full rounded-[18px] bg-black"
              style={{ maxHeight: 280, aspectRatio: "9/16", objectFit: "cover" }}
            />
            <a
              href={finalUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[18px] text-sm font-semibold transition"
              style={{ background: VARIANT_UI.successSoft, color: VARIANT_UI.success }}
            >
              <DownloadSimple size={15} weight="bold" /> Download Final Ad
            </a>
          </div>
        ) : rendering ? (
          <div className="rounded-[18px] border px-4 py-3" style={{ borderColor: VARIANT_UI.border, background: "rgba(17,17,17,0.03)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold" style={{ color: VARIANT_UI.text }}>Rendering final ad…</p>
              <p className="text-xs" style={{ color: VARIANT_UI.muted }}>{Math.round(renderProgress * 100)}%</p>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: VARIANT_UI.border }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round(renderProgress * 100)}%`, background: VARIANT_UI.accent }} />
            </div>
          </div>
        ) : (
          <>
            {error && <p className="text-xs" style={{ color: VARIANT_UI.danger }}>{error}</p>}
            <button
              onClick={handleRender}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[18px] text-sm font-semibold transition"
              style={{ background: "rgba(17,17,17,0.06)", color: VARIANT_UI.text, border: `1px solid ${VARIANT_UI.border}` }}
            >
              <Sparkle size={14} weight="fill" /> Render Final Ad
            </button>
          </>
        )}
      </div>
    );
  }

  if (vStatus === "processing") {
    return (
      <div
        className="mt-5 flex items-center gap-3 rounded-[18px] border px-4 py-3"
        style={{ background: "rgba(17,17,17,0.04)", borderColor: VARIANT_UI.border }}
      >
        <CircleNotch size={15} className="animate-spin shrink-0" style={{ color: VARIANT_UI.muted }} />
        <div>
          <p className="text-xs font-semibold" style={{ color: VARIANT_UI.text }}>Generating video…</p>
          <p className="text-[10px] mt-0.5" style={{ color: VARIANT_UI.sub }}>Usually 30–90 seconds. This page will update automatically.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-2">
      {error && <p className="text-xs" style={{ color: VARIANT_UI.danger }}>{error}</p>}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-[18px] text-sm font-semibold transition disabled:opacity-50"
        style={{ background: VARIANT_UI.accent, color: "#ffffff" }}
      >
        {loading
          ? <><CircleNotch size={14} className="animate-spin" /> Starting…</>
          : <><FilmStrip size={14} weight="regular" /> Generate Video{referenceId || presetId ? " with Style" : ""}</>
        }
      </button>
      {!referenceId && !presetId && (
        <p className="text-[10px] text-center" style={{ color: VARIANT_UI.muted }}>
          No style selected — pick a Quick Style or reference above.
        </p>
      )}
    </div>
  );
}

const STRENGTH_OPTIONS: { value: VariationStrength; label: string; desc: string; color: string }[] = [
  { value: "low",    label: "Low",    desc: "Minor wording changes that stay very close to the base ad.", color: "#15803d" },
  { value: "medium", label: "Medium", desc: "New hook direction with a meaningful script rewrite.", color: "#b45309" },
  { value: "high",   label: "High",   desc: "A stronger angle shift while keeping the same product and offer.", color: "#b91c1c" },
];

const VARIANT_UI = {
  panel: "#ffffff",
  panelSub: "#f8faff",
  border: "rgba(0,0,0,0.07)",
  text: "#111111",
  sub: "rgba(17,17,17,0.68)",
  muted: "rgba(17,17,17,0.4)",
  accent: "#1d4ed8",
  accentSoft: "rgba(29,78,216,0.07)",
  success: "#15803d",
  successSoft: "rgba(21,128,61,0.08)",
  danger: "#b91c1c",
  dangerSoft: "rgba(185,28,28,0.08)",
};

type NewBaseAdForm = {
  title: string;
  hook: string;
  script: string;
  cta: string;
  ad_type: string;
  angle: string;
  video_url: string;
};

function normalizeBaseField(value?: string | null, fallback = ""): string {
  return (value ?? fallback).trim();
}

// ─── Variant Engine tab ────────────────────────────────────────────────────────
function VariantEngine() {
  const [baseAds, setBaseAds] = useState<BaseAd[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAd, setNewAd] = useState<NewBaseAdForm>({
    title: "",
    hook: "",
    script: "",
    cta: "",
    ad_type: "general",
    angle: "",
    video_url: "",
  });
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [strength, setStrength] = useState<VariationStrength>("medium");
  const [numVariants, setNumVariants] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState<VariantOutput[]>([]);
  const [genStats, setGenStats] = useState<{ accepted: number; rejected: number; requested: number; attempts: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [promotingVariantId, setPromotingVariantId] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [teamRole, setTeamRole] = useState<TeamRole>("member");
  const [viewMode, setViewMode] = useState<ViewerMode>("consumer");
  const [styleRef,    setStyleRef]    = useState<ReferenceVideo | null>(null);
  const [stylePreset, setStylePreset] = useState<StylePreset | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/agentica/base-ads")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;

        if (!response.ok) {
          setErrorMessage(data.error ?? "Unable to load base ads.");
          setLoadingAds(false);
          return;
        }

        const ads = data.base_ads ?? [];
        setBaseAds(ads);
        setSelectedBaseId((current) => current ?? ads[0]?.id ?? null);
        setLoadingAds(false);
      })
      .catch(() => {
        if (cancelled) return;
        setErrorMessage("Unable to load base ads.");
        setLoadingAds(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/agentica/access")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;

        if (!response.ok) {
          setRoleLoading(false);
          return;
        }

        const role = (data.role ?? "member") as TeamRole;
        const canManage = Boolean(data.can_manage_library);

        setTeamRole(role);
        setViewMode(canManage ? "admin" : "consumer");
        setRoleLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRoleLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateBaseAd() {
    if (!canEditLibrary) {
      setErrorMessage("Only admins can create base ads.");
      return;
    }
    if (!newAd.hook || !newAd.script || !newAd.cta || !newAd.ad_type) return;
    setCreating(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/agentica/base-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAd),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? "Failed to save base ad.");
        return;
      }
      if (data.base_ad) {
        setBaseAds((prev) => [data.base_ad, ...prev]);
        setSelectedBaseId(data.base_ad.id);
        setShowCreate(false);
        setNewAd({
          title: "",
          hook: "",
          script: "",
          cta: "",
          ad_type: "general",
          angle: "",
          video_url: "",
        });
        setVariants([]);
        setGenStats(null);
        setStatusMessage("Base ad saved. It is now available as source DNA.");
      }
    } catch {
      setErrorMessage("Unable to save the base ad right now.");
    } finally {
      setCreating(false);
    }
  }

  async function handleGenerate() {
    if (!selectedBaseId) return;
    setGenerating(true);
    setVariants([]);
    setGenStats(null);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/agentica/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_ad_id: selectedBaseId,
          variation_strength: strength,
          number_of_variants: numVariants,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? "Failed to generate variants.");
        return;
      }
      setVariants(data.variants ?? []);
      setGenStats({
        accepted: data.accepted ?? 0,
        rejected: data.rejected ?? 0,
        requested: data.requested ?? numVariants,
        attempts: data.attempts ?? 0,
      });
      setStatusMessage(data.message ?? null);
    } catch {
      setErrorMessage("Unable to generate variants right now.");
    } finally {
      setGenerating(false);
    }
  }

  const selectedBase = baseAds.find((ad) => ad.id === selectedBaseId) ?? null;
  const currentStrength = STRENGTH_OPTIONS.find((option) => option.value === strength) ?? STRENGTH_OPTIONS[1];
  const canManageLibrary = teamRole === "owner" || teamRole === "admin";
  const effectiveView: ViewerMode = canManageLibrary ? viewMode : "consumer";
  const canEditLibrary = canManageLibrary && effectiveView === "admin";
  const createFields: Array<{
    key: keyof NewBaseAdForm;
    label: string;
    placeholder: string;
    rows?: number;
  }> = [
    { key: "title", label: "Title", placeholder: "Optional internal name for this base ad" },
    { key: "ad_type", label: "Ad Type", placeholder: "UGC, product demo, testimonial, offer" },
    { key: "angle", label: "Angle", placeholder: "Problem, desire, objection, or message angle" },
    { key: "hook", label: "Hook", placeholder: "The opening line that stops the scroll" },
    { key: "script", label: "Script", placeholder: "Main body copy or voiceover", rows: 5 },
    { key: "cta", label: "CTA", placeholder: "Shop now, book a demo, start free trial" },
    { key: "video_url", label: "Video URL", placeholder: "Optional source video URL" },
  ];

  async function handlePromoteVariant(variant: VariantOutput) {
    if (!canEditLibrary) {
      setErrorMessage("Only admins can promote variants into the base library.");
      return;
    }
    if (!selectedBase) return;
    setPromotingVariantId(variant.id);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/agentica/base-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${normalizeBaseField(selectedBase.title, selectedBase.hook)} Variant`,
          hook: variant.hook,
          script: variant.script,
          cta: variant.cta,
          ad_type: normalizeBaseField(selectedBase.ad_type, selectedBase.style_category ?? "general"),
          angle: normalizeBaseField(selectedBase.angle, selectedBase.hook),
          video_url: selectedBase.video_url ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? "Failed to promote variant.");
        return;
      }
      if (data.base_ad) {
        setBaseAds((prev) => [data.base_ad, ...prev]);
        setSelectedBaseId(data.base_ad.id);
        setVariants([]);
        setGenStats(null);
        setStatusMessage("Variant promoted to a new base ad.");
      }
    } catch {
      setErrorMessage("Unable to promote this variant right now.");
    } finally {
      setPromotingVariantId(null);
    }
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "#f5f5f4" }}>
      <div
        className="w-[340px] shrink-0 border-r flex flex-col overflow-hidden"
        style={{ borderColor: VARIANT_UI.border, background: "rgba(255,255,255,0.98)" }}
      >
        <div
          className="px-5 py-5 border-b flex items-center justify-between"
          style={{ borderColor: VARIANT_UI.border }}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: VARIANT_UI.text }}>Base Ad Library</p>
            <p className="text-xs mt-1" style={{ color: VARIANT_UI.sub }}>
              {canEditLibrary ? "Store proven creative and reuse it as source DNA." : "Browse the curated ad library."}
            </p>
          </div>
          {canEditLibrary ? (
            <button
              onClick={() => setShowCreate((value) => !value)}
              className="w-9 h-9 rounded-2xl flex items-center justify-center transition"
              style={{
                background: showCreate ? VARIANT_UI.accent : VARIANT_UI.accentSoft,
                color: showCreate ? "#ffffff" : VARIANT_UI.text,
              }}
            >
              <Plus size={15} weight="regular" />
            </button>
          ) : (
            <span
              className="px-3 py-1.5 rounded-full text-[11px] font-medium"
              style={{ background: VARIANT_UI.accentSoft, color: VARIANT_UI.sub }}
            >
              Read only
            </span>
          )}
        </div>

        {canEditLibrary && showCreate && (
          <div
            className="px-5 py-5 border-b space-y-3 overflow-y-auto"
            style={{ borderColor: VARIANT_UI.border, background: VARIANT_UI.panelSub, maxHeight: 460 }}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: VARIANT_UI.muted }}>
                New Base Ad
              </p>
              <p className="text-xs mt-1" style={{ color: VARIANT_UI.sub }}>
                Keep it simple: hook, script, CTA, plus ad type and angle.
              </p>
            </div>

            {createFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-[11px] font-medium block" style={{ color: VARIANT_UI.text }}>
                  {field.label}
                </label>
                {field.rows ? (
                  <textarea
                    rows={field.rows}
                    value={newAd[field.key]}
                    onChange={(event) => setNewAd((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full rounded-2xl border px-3 py-2.5 text-sm outline-none resize-none"
                    style={{ background: "#ffffff", borderColor: VARIANT_UI.border, color: VARIANT_UI.text, lineHeight: 1.6 }}
                  />
                ) : (
                  <input
                    value={newAd[field.key]}
                    onChange={(event) => setNewAd((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full rounded-2xl border px-3 py-2.5 text-sm outline-none"
                    style={{ background: "#ffffff", borderColor: VARIANT_UI.border, color: VARIANT_UI.text }}
                  />
                )}
              </div>
            ))}

            <button
              onClick={handleCreateBaseAd}
              disabled={creating || !newAd.hook || !newAd.script || !newAd.cta || !newAd.ad_type}
              className="w-full py-3 rounded-2xl text-sm font-semibold transition disabled:opacity-50"
              style={{ background: VARIANT_UI.accent, color: "#ffffff" }}
            >
              {creating ? "Saving base ad..." : "Save Base Ad"}
            </button>
          </div>
        )}
        <div className="px-4 py-3 border-b" style={{ borderColor: VARIANT_UI.border }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: VARIANT_UI.muted }}>
            Stored Base Ads
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingAds ? (
            <div className="flex items-center justify-center py-10">
              <CircleNotch size={18} className="animate-spin" style={{ color: VARIANT_UI.muted }} />
            </div>
          ) : baseAds.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Dna size={28} weight="duotone" className="mx-auto mb-3" style={{ color: VARIANT_UI.muted }} />
              <p className="text-sm font-medium" style={{ color: VARIANT_UI.text }}>No base ads yet</p>
              <p className="text-xs mt-1" style={{ color: VARIANT_UI.sub }}>
                {canEditLibrary
                  ? "Create one from the panel above to start the variant workflow."
                  : "An admin needs to add approved base ads before consumers can generate variants."}
              </p>
            </div>
          ) : (
            baseAds.map((ad) => {
              const active = selectedBaseId === ad.id;
              const adType = normalizeBaseField(ad.ad_type, ad.style_category ?? "general");
              const angle = normalizeBaseField(ad.angle, ad.hook);
              return (
                <button
                  key={ad.id}
                  onClick={() => {
                    setSelectedBaseId(ad.id);
                    setVariants([]);
                    setGenStats(null);
                    setStatusMessage(null);
                    setErrorMessage(null);
                    setStyleRef(null);
                    setStylePreset(null);
                  }}
                  className="w-full text-left rounded-[22px] border p-4 transition"
                  style={{
                    background: active ? VARIANT_UI.accentSoft : "#ffffff",
                    borderColor: active ? "rgba(17,17,17,0.18)" : VARIANT_UI.border,
                    boxShadow: active ? "0 16px 36px rgba(17,17,17,0.08)" : "none",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight" style={{ color: VARIANT_UI.text }}>
                        {normalizeBaseField(ad.title, ad.hook)}
                      </p>
                      <p className="text-xs mt-1 line-clamp-2" style={{ color: VARIANT_UI.sub }}>
                        {ad.hook}
                      </p>
                    </div>
                    <CaretRight size={14} weight="regular" style={{ color: VARIANT_UI.muted }} />
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    <span
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{ background: VARIANT_UI.accentSoft, color: VARIANT_UI.text }}
                    >
                      {adType}
                    </span>
                    <span
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{ background: "rgba(17,17,17,0.04)", color: VARIANT_UI.sub }}
                    >
                      {angle}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.48)" }}>
                Variant Workflow
              </p>
              <h2 className="text-3xl font-semibold mt-2 text-white">Base ad to approved variants</h2>
              <p className="text-sm mt-2 max-w-2xl" style={{ color: "rgba(255,255,255,0.68)" }}>
                Pick one source ad, vary only the hook, script wording, and CTA, then keep only the variants that stay useful without becoming duplicates.
              </p>
            </div>

            <div className="flex flex-col items-start gap-2">
              <span
                className="px-3 py-1.5 rounded-full text-[11px] font-medium capitalize"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.78)" }}
              >
                {roleLoading ? "Loading access..." : `${teamRole} role`}
              </span>

              {canManageLibrary && (
                <div
                  className="inline-flex rounded-full p-1"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  {[
                    { id: "admin" as ViewerMode, label: "Admin View" },
                    { id: "consumer" as ViewerMode, label: "Consumer Preview" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setViewMode(option.id);
                        setShowCreate(false);
                      }}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition"
                      style={{
                        background: effectiveView === option.id ? "#ffffff" : "transparent",
                        color: effectiveView === option.id ? "#111111" : "rgba(255,255,255,0.7)",
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {errorMessage && (
            <div
              className="flex items-start gap-3 rounded-[24px] border px-5 py-4"
              style={{ background: "rgba(185,28,28,0.12)", borderColor: "rgba(248,113,113,0.24)" }}
            >
              <WarningCircle size={18} weight="regular" style={{ color: "#fca5a5" }} className="mt-0.5 shrink-0" />
              <p className="text-sm" style={{ color: "#fee2e2" }}>{errorMessage}</p>
            </div>
          )}

          {statusMessage && (
            <div
              className="flex items-start gap-3 rounded-[24px] border px-5 py-4"
              style={{ background: "rgba(21,128,61,0.14)", borderColor: "rgba(134,239,172,0.2)" }}
            >
              <CheckCircle size={18} weight="regular" style={{ color: "#86efac" }} className="mt-0.5 shrink-0" />
              <p className="text-sm" style={{ color: "#dcfce7" }}>{statusMessage}</p>
            </div>
          )}

          {canManageLibrary && effectiveView === "consumer" && (
            <div
              className="flex items-start gap-3 rounded-[24px] border px-5 py-4"
              style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.12)" }}
            >
              <WarningCircle size={18} weight="regular" style={{ color: "rgba(255,255,255,0.8)" }} className="mt-0.5 shrink-0" />
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.82)" }}>
                Consumer preview is active. Library management actions are hidden.
              </p>
            </div>
          )}

        {!selectedBase ? (
            <div
              className="rounded-[32px] border p-10 text-center"
              style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" }}
            >
              <div
                className="w-16 h-16 rounded-[22px] mx-auto flex items-center justify-center mb-4"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <Dna size={28} weight="duotone" color="#ffffff" />
              </div>
              <p className="text-lg font-semibold text-white">Select a base ad</p>
              <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.68)" }}>
                The workflow starts by choosing one stored ad from the left. That becomes the source DNA for every approved variant.
              </p>
            </div>
        ) : (
          <>
              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div
                  className="rounded-[30px] border p-6"
                  style={{ background: VARIANT_UI.panel, borderColor: VARIANT_UI.border }}
                >
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: VARIANT_UI.muted }}>
                        Base Ad DNA
                      </p>
                      <h3 className="text-2xl font-semibold mt-2" style={{ color: VARIANT_UI.text }}>
                        {normalizeBaseField(selectedBase.title, selectedBase.hook)}
                      </h3>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <span className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: VARIANT_UI.accentSoft, color: VARIANT_UI.text }}>
                        {normalizeBaseField(selectedBase.ad_type, selectedBase.style_category ?? "general")}
                      </span>
                      <span className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: "rgba(17,17,17,0.04)", color: VARIANT_UI.sub }}>
                        {normalizeBaseField(selectedBase.angle, selectedBase.hook)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      { label: "Hook", value: selectedBase.hook },
                      { label: "Script", value: selectedBase.script },
                      { label: "CTA", value: selectedBase.cta },
                    ].map((row) => (
                      <div key={row.label} className="rounded-[24px] border p-4" style={{ borderColor: VARIANT_UI.border, background: VARIANT_UI.panelSub }}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: VARIANT_UI.muted }}>
                          {row.label}
                        </p>
                        <p className="text-sm mt-2 leading-6" style={{ color: VARIANT_UI.text }}>
                          {row.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {selectedBase.video_url && (
                    <a href={selectedBase.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-5 text-sm font-medium" style={{ color: VARIANT_UI.text }}>
                      <Video size={16} weight="regular" />
                      Open source video
                    </a>
                  )}
                </div>

                <div className="rounded-[30px] border p-6 space-y-6" style={{ background: VARIANT_UI.panel, borderColor: VARIANT_UI.border }}>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: VARIANT_UI.muted }}>
                      Mutation Controls
                    </p>
                    <h3 className="text-xl font-semibold mt-2" style={{ color: VARIANT_UI.text }}>Generate controlled variants</h3>
                    <p className="text-sm mt-2" style={{ color: VARIANT_UI.sub }}>
                      This keeps the ad type and offer stable while changing only the hook, script wording, and CTA.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {STRENGTH_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setStrength(option.value)}
                        className="rounded-[24px] border p-4 text-left transition"
                        style={{ background: strength === option.value ? `${option.color}10` : VARIANT_UI.panelSub, borderColor: strength === option.value ? `${option.color}55` : VARIANT_UI.border }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold" style={{ color: strength === option.value ? option.color : VARIANT_UI.text }}>
                            {option.label}
                          </p>
                          {strength === option.value && <CheckCircle size={16} weight="fill" style={{ color: option.color }} />}
                        </div>
                        <p className="text-xs mt-2 leading-5" style={{ color: VARIANT_UI.sub }}>
                          {option.desc}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-[24px] border p-4" style={{ borderColor: VARIANT_UI.border, background: VARIANT_UI.panelSub }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: VARIANT_UI.muted }}>
                      Number of Variants
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {[2, 3, 5, 8].map((count) => (
                        <button
                          key={count}
                          onClick={() => setNumVariants(count)}
                          className="min-w-11 px-4 py-2 rounded-2xl text-sm font-semibold transition"
                          style={{ background: numVariants === count ? VARIANT_UI.accent : "#ffffff", color: numVariants === count ? "#ffffff" : VARIANT_UI.text, border: `1px solid ${numVariants === count ? VARIANT_UI.accent : VARIANT_UI.border}` }}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] border p-4" style={{ borderColor: VARIANT_UI.border, background: VARIANT_UI.panelSub }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: VARIANT_UI.muted }}>
                      Current Setting
                    </p>
                    <p className="text-sm mt-2" style={{ color: VARIANT_UI.text }}>
                      {currentStrength.label} strength, {numVariants} requested variants
                    </p>
                    <p className="text-xs mt-2 leading-5" style={{ color: VARIANT_UI.sub }}>
                      The generator will keep only the variants that are distinct enough from the base ad and from each other.
                    </p>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full flex items-center justify-center gap-2 rounded-[24px] px-5 py-3.5 text-sm font-semibold transition disabled:opacity-50"
                    style={{ background: VARIANT_UI.accent, color: "#ffffff" }}
                  >
                    {generating ? <CircleNotch size={16} className="animate-spin" /> : <Lightning size={16} weight="regular" />}
                    {generating ? "Generating variants..." : "Generate Approved Variants"}
                  </button>
                </div>
              </div>

              <ReferenceSelector
                selected={styleRef}
                onSelect={ref => { setStyleRef(ref); if (ref) setStylePreset(null); }}
                selectedPreset={stylePreset}
                onSelectPreset={setStylePreset}
                canManage={canEditLibrary}
              />

              {genStats && (
                <div className="grid gap-4 sm:grid-cols-4">
                  {[
                    { label: "Approved", value: genStats.accepted, color: VARIANT_UI.success, surface: VARIANT_UI.panel, border: VARIANT_UI.border, muted: VARIANT_UI.muted },
                    { label: "Filtered", value: genStats.rejected, color: VARIANT_UI.danger, surface: VARIANT_UI.panel, border: VARIANT_UI.border, muted: VARIANT_UI.muted },
                    { label: "Requested", value: genStats.requested, color: VARIANT_UI.text, surface: VARIANT_UI.panel, border: VARIANT_UI.border, muted: VARIANT_UI.muted },
                    { label: "Attempts", value: genStats.attempts, color: VARIANT_UI.text, surface: VARIANT_UI.panelSub, border: VARIANT_UI.border, muted: VARIANT_UI.muted },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[24px] border px-5 py-4" style={{ background: item.surface, borderColor: item.border }}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: item.muted }}>
                        {item.label}
                      </p>
                      <p className="text-2xl font-semibold mt-2" style={{ color: item.color }}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.48)" }}>
                    Approved Variants
                  </p>
                  <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.68)" }}>
                    Keep the good outputs, then promote a winner into a new base ad when it deserves another testing round.
                  </p>
                </div>

                {variants.length === 0 ? (
                  <div className="rounded-[30px] border p-8" style={{ background: VARIANT_UI.panelSub, borderColor: VARIANT_UI.border }}>
                    <p className="text-lg font-semibold" style={{ color: VARIANT_UI.text }}>No approved variants yet</p>
                    <p className="text-sm mt-2 max-w-2xl" style={{ color: VARIANT_UI.sub }}>
                      Generate variants from the selected base ad. Only outputs that pass the similarity checks will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {variants.map((variant, index) => {
                      const baseSimilarity = Math.round((variant.similarity_score ?? 0) * 100);
                      const siblingSimilarity = Math.round((variant.sibling_similarity ?? 0) * 100);
                      const promoting = promotingVariantId === variant.id;

                      return (
                        <div key={variant.id} className="rounded-[30px] border p-5" style={{ background: VARIANT_UI.panel, borderColor: VARIANT_UI.border }}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-[16px] flex items-center justify-center text-sm font-semibold shrink-0" style={{ background: VARIANT_UI.accent, color: "#ffffff" }}>
                                {index + 1}
                              </div>
                              <div className="min-w-0">
                                <p className="text-base font-semibold leading-tight" style={{ color: VARIANT_UI.text }}>
                                  {variant.hook}
                                </p>
                                <p className="text-xs mt-2" style={{ color: VARIANT_UI.sub }}>
                                  Approved output ready for testing
                                </p>
                              </div>
                            </div>

                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium shrink-0" style={{ background: VARIANT_UI.successSoft, color: VARIANT_UI.success }}>
                              <CheckCircle size={12} weight="fill" />
                              Approved
                            </span>
                          </div>

                          <div className="grid gap-3 mt-5 sm:grid-cols-2">
                            <div className="rounded-[22px] border p-4" style={{ borderColor: VARIANT_UI.border, background: VARIANT_UI.panelSub }}>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: VARIANT_UI.muted }}>
                                Similarity to Base
                              </p>
                              <p className="text-2xl font-semibold mt-2" style={{ color: VARIANT_UI.text }}>
                                {baseSimilarity}%
                              </p>
                            </div>
                            <div className="rounded-[22px] border p-4" style={{ borderColor: VARIANT_UI.border, background: VARIANT_UI.panelSub }}>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: VARIANT_UI.muted }}>
                                Closest Sibling
                              </p>
                              <p className="text-2xl font-semibold mt-2" style={{ color: VARIANT_UI.text }}>
                                {siblingSimilarity}%
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3 mt-5">
                            {[
                              { label: "Hook", value: variant.hook },
                              { label: "Script", value: variant.script },
                              { label: "CTA", value: variant.cta },
                            ].map((row) => (
                              <div key={row.label} className="rounded-[22px] border p-4" style={{ borderColor: VARIANT_UI.border, background: VARIANT_UI.panelSub }}>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: VARIANT_UI.muted }}>
                                  {row.label}
                                </p>
                                <p className="text-sm mt-2 leading-6" style={{ color: VARIANT_UI.text }}>
                                  {row.value}
                                </p>
                              </div>
                            ))}
                          </div>

                          <VideoGenerateButton
                            variant={variant}
                            referenceId={styleRef?.id ?? null}
                            presetId={stylePreset?.id ?? null}
                            styleCategory={stylePreset?.style_category ?? styleRef?.style_category ?? "lifestyle"}
                            brandName="Agentica"
                            primaryColor={stylePreset?.accent ?? "#111111"}
                            accentColor={stylePreset?.accent ?? "#6d28d9"}
                            onVideoReady={(vid, url) =>
                              setVariants(prev => prev.map(v =>
                                v.id === vid ? { ...v, videoStatus: "ready", videoUrl: url } : v
                              ))
                            }
                          />

                          {canEditLibrary ? (
                            <button
                              onClick={() => handlePromoteVariant(variant)}
                              disabled={promoting}
                              className="w-full mt-3 rounded-[22px] px-4 py-3 text-sm font-semibold transition disabled:opacity-50"
                              style={{ background: VARIANT_UI.accentSoft, color: VARIANT_UI.text }}
                            >
                              {promoting ? "Promoting to base ad..." : "Use as New Base Ad"}
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
        )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdsPage() {
  const [tab, setTab] = useState<"templates" | "variants">("variants");

  // Templates tab state
  const [selectedId, setSelectedId]         = useState<string | null>(null);
  const [form, setForm]                     = useState<Record<string, string>>({});
  const [brandName, setBrandName]           = useState("Your Brand");
  const [primaryColor, setPrimaryColor]     = useState("#6d28d9");
  const [accentColor, setAccentColor]       = useState("#a78bfa");
  const [brandPhotos, setBrandPhotos]       = useState<string[]>([]);
  const [filling, setFilling]               = useState(false);
  const [renderState, setRenderState]       = useState<RenderState>("idle");
  const [progress, setProgress]             = useState(0);
  const [videoUrl, setVideoUrl]             = useState<string | null>(null);
  const [errorMsg, setErrorMsg]             = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(data => {
      if (data.profile_brand) setBrandName(data.profile_brand);
      if (data.brand_primary) setPrimaryColor(data.brand_primary);
      if (data.brand_accent)  setAccentColor(data.brand_accent);
      if (data.brand_photos)  { try { setBrandPhotos(JSON.parse(data.brand_photos)); } catch {} }
    }).catch(() => {});
  }, []);

  async function handleAIFill() {
    if (!selectedId) return;
    setFilling(true);
    try {
      const res  = await fetch("/api/ads/fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedId }),
      });
      const data = await res.json();
      if (data.fields) {
        const imgTemplates = ["ProductSpotlight", "UGCFrame"];
        const extra = imgTemplates.includes(selectedId) && brandPhotos[0] ? { imageUrl: brandPhotos[0] } : {};
        setForm({ ...data.fields, ...extra });
      }
    } catch {}
    setFilling(false);
  }

  const selected = TEMPLATES.find(t => t.id === selectedId);

  function selectTemplate(id: string) {
    setSelectedId(id);
    setForm({});
    setRenderState("idle");
    setVideoUrl(null);
    setErrorMsg(null);
    setProgress(0);
    if (pollRef.current) clearInterval(pollRef.current);
  }

  async function handleRender() {
    if (!selected) return;
    setRenderState("starting");
    setVideoUrl(null);
    setErrorMsg(null);
    setProgress(0);
    const inputProps = buildInputProps(selected.id, form, brandName, primaryColor, accentColor);
    try {
      const res  = await fetch("/api/ads/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compositionId: selected.id, inputProps }),
      });
      const data = await res.json();
      if (!res.ok) { setRenderState("error"); setErrorMsg(data.error); return; }
      const { renderId, bucketName } = data;
      setRenderState("rendering");
      pollRef.current = setInterval(async () => {
        try {
          const sr = await fetch(`/api/ads/status?renderId=${renderId}&bucketName=${bucketName}`);
          const sd = await sr.json();
          if (sd.status === "done") {
            clearInterval(pollRef.current!);
            setVideoUrl(sd.url);
            setRenderState("done");
          } else if (sd.status === "error") {
            clearInterval(pollRef.current!);
            setRenderState("error");
            setErrorMsg(sd.error ?? "Render failed");
          } else {
            setProgress(sd.progress ?? 0);
          }
        } catch { /* keep polling */ }
      }, 3000);
    } catch (err: unknown) {
      setRenderState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#ffffff" }}>

      {/* ── Top bar with tabs ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 px-5 border-b shrink-0" style={{ borderColor: "rgba(0,0,0,0.07)", height: 52, background: "#ffffff" }}>
        <div className="flex items-center gap-1.5 mr-4">
          <FilmStrip size={15} weight="regular" style={{ color: "#1d4ed8" }} />
          <span className="text-sm font-bold" style={{ color: "#111111" }}>Ad Studio</span>
        </div>
        <div className="flex items-center gap-1">
          {[
            { id: "templates", label: "Templates", icon: Stack },
            { id: "variants",  label: "Variant Engine", icon: Dna },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as "templates" | "variants")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
              style={{
                background: tab === t.id ? "#1d4ed8" : "transparent",
                color:      tab === t.id ? "#ffffff" : "rgba(0,0,0,0.45)",
              }}
            >
              <t.icon size={12} weight="regular" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">

        {tab === "variants" && <VariantEngine />}

        {tab === "templates" && (
          <div className="flex h-full overflow-hidden">

            {/* Left: template picker */}
            <div className="w-[340px] shrink-0 border-r border-glass glass-card flex flex-col overflow-hidden">
              <div className="px-6 py-5 border-b border-glass">
                <p className="text-xs text-dm mt-0.5">Pick a template · fill in content · render to MP4</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => selectTemplate(t.id)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all flex items-center gap-3 ${
                      selectedId === t.id
                        ? "border-transparent shadow-md"
                        : "border-glass hover:border-glass hover:glass-sub"
                    }`}
                    style={selectedId === t.id ? { background: `${t.color}10`, borderColor: `${t.color}30` } : {}}
                  >
                    <div
                      className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center"
                      style={{ background: `${t.color}18` }}
                    >
                      <t.icon size={15} weight="regular" style={{ color: t.accent }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-dh">{t.name}</p>
                      <p className="text-[11px] text-dm truncate">{t.description}</p>
                    </div>
                    <CaretRight size={14} weight="regular" className="text-dm shrink-0 ml-auto" />
                  </button>
                ))}
              </div>
            </div>

            {/* Right: editor + render */}
            <div className="flex-1 overflow-y-auto p-8">
              {!selected ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-5">
                    <FilmStrip size={28} weight="duotone" className="text-violet-400" />
                  </div>
                  <p className="text-base font-semibold text-dp mb-1">Choose a template</p>
                  <p className="text-sm text-dm max-w-xs">Select one of the 8 ad templates on the left to get started.</p>
                </div>
              ) : (
                <div className="max-w-xl mx-auto space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${selected.color}15` }}>
                      <selected.icon size={22} weight="regular" style={{ color: selected.accent }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-dh">{selected.name}</h2>
                      <p className="text-sm text-dm">{selected.description}</p>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-5 space-y-4">
                    <p className="text-xs font-bold text-dm uppercase tracking-widest">Brand</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1">
                        <label className="text-[10px] font-semibold text-dm uppercase tracking-wide block mb-1">Brand Name</label>
                        <input
                          value={brandName}
                          onChange={e => setBrandName(e.target.value)}
                          className="w-full rounded-lg border border-glass glass-sub px-3 py-2 text-sm text-dp focus:outline-none focus:border-gray-400 transition"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-dm uppercase tracking-wide block mb-1">Primary Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-9 h-9 rounded-lg border border-glass cursor-pointer" />
                          <span className="text-xs text-ds font-mono">{primaryColor}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-dm uppercase tracking-wide block mb-1">Accent Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-9 h-9 rounded-lg border border-glass cursor-pointer" />
                          <span className="text-xs text-ds font-mono">{accentColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-dm uppercase tracking-widest">Content</p>
                      <button
                        onClick={handleAIFill}
                        disabled={filling}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 text-xs font-semibold hover:bg-violet-100 transition disabled:opacity-50"
                      >
                        {filling ? <CircleNotch size={12} className="animate-spin" /> : <MagicWand size={12} weight="regular" />}
                        {filling ? "Writing..." : "AI Fill"}
                      </button>
                    </div>
                    <div className="space-y-3">
                      {selected.fields.map(field => (
                        <div key={field.key}>
                          <label className="text-[10px] font-semibold text-dm uppercase tracking-wide block mb-1">{field.label}</label>
                          <input
                            type={field.type ?? "text"}
                            value={form[field.key] ?? ""}
                            onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                            placeholder={field.placeholder}
                            className="w-full rounded-lg border border-glass glass-sub px-3 py-2 text-sm text-dp placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:glass-card transition"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {renderState === "idle" && (
                    <button
                      onClick={handleRender}
                      className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition hover:opacity-90"
                      style={{ background: `linear-gradient(135deg, ${selected.color}, ${selected.accent})` }}
                    >
                      <Sparkle size={16} weight="regular" /> Render Ad
                    </button>
                  )}

                  {(renderState === "starting" || renderState === "rendering") && (
                    <div className="glass-card rounded-2xl p-6 text-center space-y-4">
                      <CircleNotch size={32} className="text-violet-500 animate-spin mx-auto" />
                      <div>
                        <p className="text-sm font-semibold text-dp">
                          {renderState === "starting" ? "Starting render..." : `Rendering... ${progress}%`}
                        </p>
                        <p className="text-xs text-dm mt-1">Usually takes 20–40 seconds</p>
                      </div>
                      {renderState === "rendering" && (
                        <div className="w-full glass-sub rounded-full h-1.5">
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${selected.color}, ${selected.accent})` }} />
                        </div>
                      )}
                    </div>
                  )}

                  {renderState === "done" && videoUrl && (
                    <div className="glass-card rounded-2xl overflow-hidden">
                      <video src={videoUrl} controls className="w-full max-h-[480px] bg-black" style={{ aspectRatio: "9/16", objectFit: "contain" }} />
                      <div className="p-4 flex gap-2">
                        <a
                          href={videoUrl}
                          download={`${selected.id}-ad.mp4`}
                          className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-700 transition"
                        >
                          <DownloadSimple size={14} weight="regular" /> Download MP4
                        </a>
                        <button
                          onClick={() => { setRenderState("idle"); setVideoUrl(null); }}
                          className="px-4 py-2.5 rounded-xl glass-sub text-ds text-sm font-semibold hover:bg-gray-200 transition flex items-center gap-2"
                        >
                          <ArrowClockwise size={14} weight="regular" /> Re-render
                        </button>
                      </div>
                    </div>
                  )}

                  {renderState === "error" && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
                      <WarningCircle size={18} weight="regular" className="text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-700">Render failed</p>
                        <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
                        <button onClick={() => setRenderState("idle")} className="mt-3 text-xs font-semibold text-red-600 hover:text-red-800 transition">
                          Try again →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

