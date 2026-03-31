"use client";

import { useState, useEffect, useRef } from "react";
import { Film, Download, Loader2, AlertCircle, RefreshCw, ChevronRight, Sparkles, Wand2 } from "lucide-react";

// ─── Template definitions ──────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: "ProductSpotlight",
    name: "Product Spotlight",
    description: "Hero shot with animated headline and CTA",
    emoji: "✨",
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
    emoji: "🔥",
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
    emoji: "⭐",
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
    emoji: "🎬",
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
    emoji: "📊",
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
    emoji: "📲",
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
    emoji: "↔️",
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
    emoji: "🎥",
    color: "#be185d",
    accent: "#f472b6",
    fields: [
      { key: "creatorHandle", label: "Creator Handle", placeholder: "foodiename" },
      { key: "caption",       label: "Caption",        placeholder: "Can't believe how good this was 🔥" },
      { key: "imageUrl",      label: "Image URL",      placeholder: "https://... (optional)" },
    ],
  },
];

// ─── Build inputProps from flat form fields ────────────────────────────────────
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm]             = useState<Record<string, string>>({});
  const [brandName, setBrandName]   = useState("Your Brand");
  const [primaryColor, setPrimaryColor] = useState("#6d28d9");
  const [accentColor, setAccentColor]   = useState("#a78bfa");
  const [brandPhotos, setBrandPhotos]   = useState<string[]>([]);

  const [filling, setFilling]           = useState(false);
  const [renderState, setRenderState]   = useState<RenderState>("idle");
  const [progress, setProgress]         = useState(0);
  const [videoUrl, setVideoUrl]         = useState<string | null>(null);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load brand settings
  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(data => {
      if (data.profile_brand)   setBrandName(data.profile_brand);
      if (data.brand_primary)   setPrimaryColor(data.brand_primary);
      if (data.brand_accent)    setAccentColor(data.brand_accent);
      if (data.brand_photos)    { try { setBrandPhotos(JSON.parse(data.brand_photos)); } catch {} }
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
        // Auto-inject first product photo for image templates
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
          const sr   = await fetch(`/api/ads/status?renderId=${renderId}&bucketName=${bucketName}`);
          const sd   = await sr.json();
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
    <div className="flex h-screen overflow-hidden glass-sub/50">

      {/* ── Left: template picker ──────────────────────────────────────── */}
      <div className="w-[340px] shrink-0 border-r border-glass glass-card flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-glass">
          <h1 className="text-base font-bold text-dh">Ad Studio</h1>
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
              <div className="text-2xl shrink-0">{t.emoji}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-dh">{t.name}</p>
                <p className="text-[11px] text-dm truncate">{t.description}</p>
              </div>
              <ChevronRight size={14} className="text-dm shrink-0 ml-auto" />
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: editor + render ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-8">
        {!selected ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-5">
              <Film size={28} className="text-violet-400" />
            </div>
            <p className="text-base font-semibold text-dp mb-1">Choose a template</p>
            <p className="text-sm text-dm max-w-xs">Select one of the 8 ad templates on the left to get started.</p>
          </div>
        ) : (
          <div className="max-w-xl mx-auto space-y-6">

            {/* Template header */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: `${selected.color}15` }}>
                {selected.emoji}
              </div>
              <div>
                <h2 className="text-xl font-bold text-dh">{selected.name}</h2>
                <p className="text-sm text-dm">{selected.description}</p>
              </div>
            </div>

            {/* Brand settings */}
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

            {/* Content fields */}
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-dm uppercase tracking-widest">Content</p>
                <button
                  onClick={handleAIFill}
                  disabled={filling}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 text-xs font-semibold hover:bg-violet-100 transition disabled:opacity-50"
                >
                  {filling ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
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

            {/* Render button */}
            {renderState === "idle" && (
              <button
                onClick={handleRender}
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${selected.color}, ${selected.accent})` }}
              >
                <Sparkles size={16} /> Render Ad
              </button>
            )}

            {/* Rendering progress */}
            {(renderState === "starting" || renderState === "rendering") && (
              <div className="glass-card rounded-2xl p-6 text-center space-y-4">
                <Loader2 size={32} className="text-violet-500 animate-spin mx-auto" />
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

            {/* Done */}
            {renderState === "done" && videoUrl && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <video src={videoUrl} controls className="w-full max-h-[480px] bg-black" style={{ aspectRatio: "9/16", objectFit: "contain" }} />
                <div className="p-4 flex gap-2">
                  <a
                    href={videoUrl}
                    download={`${selected.id}-ad.mp4`}
                    className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-700 transition"
                  >
                    <Download size={14} /> Download MP4
                  </a>
                  <button
                    onClick={() => { setRenderState("idle"); setVideoUrl(null); }}
                    className="px-4 py-2.5 rounded-xl glass-sub text-ds text-sm font-semibold hover:bg-gray-200 transition flex items-center gap-2"
                  >
                    <RefreshCw size={14} /> Re-render
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {renderState === "error" && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
                <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
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
  );
}
