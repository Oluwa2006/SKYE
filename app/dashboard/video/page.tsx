"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles, Loader2, Download, RefreshCw,
  CheckCircle2, AlertCircle, Clock, SlidersHorizontal,
  Plus, X, Film, ImagePlus, Trash2,
  Settings2, Camera, Wand2,
  ChevronLeft, Smartphone, Square, Monitor,
  Play, SkipBack, SkipForward, ZoomIn, Volume2,
  MoreVertical, ChevronRight,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
type AspectRatio  = "9:16" | "1:1" | "16:9";
type Duration     = "5" | "10";
type Mode         = "std" | "pro";
type Provider     = "higgsfield" | "kling" | "pika";
type SceneStatus  = "idle" | "submitting" | "processing" | "done" | "error";
type BottomTab    = "settings" | "camera" | "fx";

interface CameraPreset {
  type:  string;
  label: string;
  icon:  string;
}

interface Scene {
  id:        string;
  prompt:    string;
  imageUrl:  string | null;
  status:    SceneStatus;
  videoUrl:  string | null;
  taskId:    string | null;
  errorMsg:  string | null;
  elapsed:   number;
  // Engine is locked per-scene at generation time — never shared across scenes
  lockedEngine: Provider | null;  // null = not yet generated
}

// ─── Constants ──────────────────────────────────────────────────────────────
const COST_KLING: Record<Duration, number> = { "5": 0.35, "10": 0.70 };
const COST_PIKA:  Record<Duration, number> = { "5": 0.20, "10": 0.40 };

const CAMERA_PRESETS: CameraPreset[] = [
  { type: "static",        label: "Static",    icon: "⊙" },
  { type: "zoom_in",       label: "Zoom In",   icon: "⊕" },
  { type: "zoom_out",      label: "Zoom Out",  icon: "⊖" },
  { type: "pan_left",      label: "Pan Left",  icon: "←" },
  { type: "pan_right",     label: "Pan Right",  icon: "→" },
  { type: "tilt_up",       label: "Tilt Up",   icon: "↑" },
  { type: "tilt_down",     label: "Tilt Down", icon: "↓" },
  { type: "push_forward",  label: "Push Fwd",  icon: "▶" },
  { type: "pull_back",     label: "Pull Back", icon: "◀" },
];

const PIKA_EFFECTS = [
  { value: "none",     label: "None",     color: "" },
  { value: "explode",  label: "Explode",  color: "text-orange-500" },
  { value: "melt",     label: "Melt",     color: "text-amber-500"  },
  { value: "deflate",  label: "Deflate",  color: "text-blue-500"   },
  { value: "inflate",  label: "Inflate",  color: "text-sky-500"    },
  { value: "squish",   label: "Squish",   color: "text-green-500"  },
  { value: "crush",    label: "Crush",    color: "text-red-500"    },
  { value: "zoom_in",  label: "Zoom In",  color: "text-violet-500" },
  { value: "zoom_out", label: "Zoom Out", color: "text-fuchsia-500"},
  { value: "spin",     label: "Spin",     color: "text-pink-500"   },
];

// ─── Helpers ─────────────────────────────────────────────────────────────
function uid()      { return Math.random().toString(36).slice(2, 9); }
function fmtTime(s: number) { return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`; }
function newScene(prompt = ""): Scene {
  return { id: uid(), prompt, imageUrl: null, status: "idle", videoUrl: null, taskId: null, errorMsg: null, elapsed: 0, lockedEngine: null };
}

// ─── Main Page ────────────────────────────────────────────────────────────
// ─── Engine routing logic ────────────────────────────────────────────────────
type ContentType = "lifestyle" | "environmental" | "product" | null;

const CONTENT_ROUTE: Record<NonNullable<ContentType>, Provider> = {
  lifestyle:     "higgsfield",  // people, emotion, human movement
  environmental: "kling",       // scenes, locations, camera motion
  product:       "pika",        // still images animated, product close-ups
};

const CONTENT_LABELS: Record<NonNullable<ContentType>, { label: string; hint: string; icon: string }> = {
  lifestyle:     { label: "People & Lifestyle", hint: "→ Higgsfield",  icon: "🧍" },
  environmental: { label: "Environment & Scene",hint: "→ Kling 2.6",   icon: "🏙️" },
  product:       { label: "Product / Still",    hint: "→ Pika 2.0",    icon: "📦" },
};

function VideoStudioPageContent() {
  const [provider,        setProvider]        = useState<Provider>("higgsfield");
  const [contentType,     setContentType]     = useState<ContentType>(null);
  const [manualOverride,  setManualOverride]  = useState(false);
  const [aspectRatio,     setAspectRatio]     = useState<AspectRatio>("9:16");
  const [duration,        setDuration]        = useState<Duration>("5");
  const [mode,            setMode]            = useState<Mode>("pro");
  const [cfgScale,        setCfgScale]        = useState(0.5);
  const [negPrompt,       setNegPrompt]       = useState("blur, distort, low quality, shaky cam, watermark, blurry faces, distorted hands, jerky motion");
  const [cameraType,      setCameraType]      = useState("static");
  const [pikaffect,       setPikaffect]       = useState("none");
  const [bottomTab,       setBottomTab]       = useState<BottomTab>("settings");

  // Pick content type → auto-routes engine unless user has manually overridden
  function pickContentType(ct: ContentType) {
    setContentType(ct);
    if (!manualOverride && ct) {
      setProvider(CONTENT_ROUTE[ct]);
    }
  }

  // Manual engine pick → marks as override so auto-routing won't stomp it
  function pickEngine(eng: Provider) {
    setProvider(eng);
    setManualOverride(true);
  }

  // Reset override → go back to auto-routing
  function resetToAuto() {
    setManualOverride(false);
    if (contentType) setProvider(CONTENT_ROUTE[contentType]);
  }

  const searchParams  = useSearchParams();
  const initialPrompt = searchParams.get("prompt") ?? "";

  const [scenes,   setScenes]   = useState<Scene[]>(() => [newScene(initialPrompt)]);
  const [activeId, setActiveId] = useState<string>(() => "");

  useEffect(() => { setActiveId(s => s || scenes[0]?.id || ""); }, []); // eslint-disable-line

  const activeScene = scenes.find(s => s.id === activeId) ?? scenes[0];

  const timerRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const pollRefs  = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  useEffect(() => () => {
    Object.values(timerRefs.current).forEach(clearInterval);
    Object.values(pollRefs.current).forEach(clearInterval);
  }, []);

  function stopScene(id: string) {
    if (timerRefs.current[id]) { clearInterval(timerRefs.current[id]); delete timerRefs.current[id]; }
    if (pollRefs.current[id])  { clearInterval(pollRefs.current[id]);  delete pollRefs.current[id];  }
  }

  const patchScene = useCallback((id: string, patch: Partial<Scene>) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }, []);

  async function startPolling(id: string, taskId: string, prov: Provider) {
    timerRefs.current[id] = setInterval(() => {
      setScenes(prev => prev.map(s => s.id === id ? { ...s, elapsed: s.elapsed + 1 } : s));
    }, 1000);
    const route =
      prov === "higgsfield" ? "/api/video/higgsfield-status" :
      prov === "kling"      ? "/api/video/status" :
                              "/api/video/pika-status";
    pollRefs.current[id] = setInterval(async () => {
      try {
        const res  = await fetch(`${route}?taskId=${taskId}`);
        const data = await res.json();
        if (data.status === "succeed") {
          stopScene(id); patchScene(id, { status: "done", videoUrl: data.videoUrl });
        } else if (data.status === "failed") {
          stopScene(id); patchScene(id, { status: "error", errorMsg: "Generation failed." });
        }
      } catch {
        stopScene(id); patchScene(id, { status: "error", errorMsg: "Lost connection." });
      }
    }, 6000);
  }

  async function generateScene(id: string) {
    const scene = scenes.find(s => s.id === id);
    if (!scene || !scene.prompt.trim()) return;

    // Lock the engine for this scene right now — it will NEVER change after this point.
    // This ensures one scene = one engine = one consistent style.
    const engine: Provider = provider;

    stopScene(id);
    patchScene(id, { status: "submitting", videoUrl: null, errorMsg: null, elapsed: 0, lockedEngine: engine });

    const route =
      engine === "higgsfield" ? "/api/video/higgsfield-generate" :
      engine === "kling"      ? "/api/video/generate" :
                                "/api/video/pika-generate";

    try {
      const body: Record<string, unknown> = {
        prompt: scene.prompt, negative_prompt: negPrompt,
        aspect_ratio: aspectRatio, duration, mode, cfg_scale: cfgScale,
      };
      if (scene.imageUrl) body.image_url = scene.imageUrl;
      if (engine === "kling" && cameraType !== "static") body.camera_control = { type: cameraType };
      if (engine === "pika"  && pikaffect  !== "none")   body.pikaffect = pikaffect;

      const res  = await fetch(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Failed to submit");

      // Pass the locked engine to polling — not whatever global provider is later
      patchScene(id, { status: "processing", taskId: data.taskId });
      startPolling(id, data.taskId, engine);
    } catch (err) {
      patchScene(id, { status: "error", errorMsg: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  function handleImageFile(file: File) {
    const reader = new FileReader();
    reader.onload = e => patchScene(activeId, { imageUrl: e.target?.result as string });
    reader.readAsDataURL(file);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleImageFile(file);
  }
  function addScene() {
    const s = newScene();
    setScenes(prev => [...prev, s]);
    setActiveId(s.id);
  }
  function removeScene(id: string) {
    stopScene(id);
    setScenes(prev => {
      const next = prev.filter(s => s.id !== id);
      if (activeId === id) setActiveId(next[next.length - 1]?.id ?? "");
      return next;
    });
  }

  const COST_MAP: Record<Provider, Record<Duration, number>> = {
    higgsfield: { "5": 0.25, "10": 0.50 },
    kling:      { "5": 0.35, "10": 0.70 },
    pika:       { "5": 0.20, "10": 0.40 },
  };
  const cost = COST_MAP[provider][duration];
  const isPlaying    = activeScene?.status === "done" && !!activeScene?.videoUrl;
  const canGenerate  = !!(activeScene?.prompt.trim()) && activeScene?.status !== "submitting" && activeScene?.status !== "processing";
  const sceneIndex   = scenes.findIndex(s => s.id === activeId);
  const resDims      = aspectRatio === "9:16" ? "W810 · H1440" : aspectRatio === "1:1" ? "W1080 · H1080" : "W1440 · H810";

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>

      {/* ════════════════════════════════════════════════════════════════════
          TOP BAR
          ════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center px-4 h-11 shrink-0 glass-card" style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
        <button className="flex items-center gap-1 text-xs text-dm hover:text-ds transition mr-3">
          <ChevronLeft size={14} strokeWidth={1.8} />
        </button>
        <span className="text-sm font-semibold text-dh" style={{ fontFamily: "Gilroy" }}>
          Video Studio
        </span>
        <span className="text-xs text-dm ml-2">Scene {sceneIndex + 1}</span>

        <div className="flex-1" />

        {/* Aspect-ratio device icons */}
        <div className="flex items-center gap-1 mr-4">
          {([
            { r: "9:16" as AspectRatio, Icon: Smartphone },
            { r: "1:1"  as AspectRatio, Icon: Square },
            { r: "16:9" as AspectRatio, Icon: Monitor },
          ]).map(({ r, Icon }) => (
            <button
              key={r}
              onClick={() => setAspectRatio(r)}
              className="p-1.5 rounded-lg transition"
              style={{
                background: aspectRatio === r ? "rgba(255,255,255,0.25)" : "transparent",
                color: aspectRatio === r ? "#4a3888" : "rgba(40,30,70,0.35)",
              }}
            >
              <Icon size={14} strokeWidth={1.6} />
            </button>
          ))}
        </div>

        <span className="text-[11px] font-mono text-dm tracking-wide">{resDims}</span>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MIDDLE: Left scenes | Center preview | Right settings
          ════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 min-h-0">

        {/* ── LEFT: Scenes panel ──────────────────────────────────────── */}
        <div
          className="w-44 shrink-0 flex flex-col overflow-hidden"
          style={{ borderRight: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)" }}
        >
          {/* Add scene button */}
          {scenes.length < 8 && (
            <button
              onClick={addScene}
              className="flex items-center justify-center gap-2 mx-2 mt-2 mb-1 py-2 rounded-xl text-xs font-semibold text-dm hover:text-violet-500 transition"
              style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)" }}
            >
              <Plus size={13} strokeWidth={1.8} /> Add Scene
            </button>
          )}

          {/* Scene list */}
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-2">
            {scenes.map((scene, i) => {
              const active = scene.id === activeId;
              const hasBg  = !!(scene.videoUrl || scene.imageUrl);
              return (
                <div
                  key={scene.id}
                  onClick={() => setActiveId(scene.id)}
                  className={`relative rounded-xl cursor-pointer transition-all overflow-hidden group ${
                    active ? "ring-2 ring-violet-300" : ""
                  }`}
                  style={{
                    background: hasBg ? "transparent" : "rgba(255,255,255,0.10)",
                    border: active ? "1px solid rgba(120,80,200,0.4)" : "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-2.5 py-1.5">
                    <span className="text-[10px] font-semibold text-ds">
                      {scene.prompt ? `Scene ${i + 1}` : "Untitled Scene"}
                    </span>
                    <div className="flex items-center gap-1">
                      {/* Engine lock badge — shows which engine is permanently assigned */}
                      {scene.lockedEngine && (
                        <span className="text-[7px] font-bold uppercase px-1 py-0.5 rounded leading-none"
                          style={{
                            background: scene.lockedEngine === "higgsfield" ? "rgba(120,80,200,0.15)"
                                      : scene.lockedEngine === "kling"      ? "rgba(40,120,200,0.15)"
                                      : "rgba(220,60,140,0.15)",
                            color: scene.lockedEngine === "higgsfield" ? "#6040c0"
                                 : scene.lockedEngine === "kling"      ? "#2060a0"
                                 : "#b03080",
                          }}>
                          {scene.lockedEngine === "higgsfield" ? "HF" : scene.lockedEngine === "kling" ? "KL" : "PK"}
                        </span>
                      )}
                      {scene.status === "processing" && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                      {scene.status === "done"       && <CheckCircle2 size={10} className="text-emerald-400" />}
                      {scene.status === "error"      && <AlertCircle  size={10} className="text-red-400" />}
                      <button
                        onClick={e => { e.stopPropagation(); if (scenes.length > 1) removeScene(scene.id); }}
                        className="opacity-0 group-hover:opacity-100 transition text-dm hover:text-red-400"
                      >
                        <MoreVertical size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail area */}
                  <div className="relative mx-2 mb-2 h-20 rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    {scene.videoUrl && <video src={scene.videoUrl} className="absolute inset-0 w-full h-full object-cover" muted />}
                    {!scene.videoUrl && scene.imageUrl && <img src={scene.imageUrl} className="absolute inset-0 w-full h-full object-cover" alt="" />}
                    {!scene.videoUrl && !scene.imageUrl && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Film size={20} className="text-dm" strokeWidth={1.2} />
                      </div>
                    )}
                    {scene.videoUrl && (
                      <div className="absolute bottom-1 right-1 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold text-white" style={{ background: "rgba(0,0,0,0.5)" }}>
                        <Clock size={8} /> {duration}s
                      </div>
                    )}
                    {(scene.status === "submitting" || scene.status === "processing") && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.5)", backdropFilter: "blur(4px)" }}>
                        <Loader2 size={16} className="animate-spin text-violet-500" />
                      </div>
                    )}
                  </div>

                  {/* Effect label */}
                  {scene.prompt && (
                    <div className="px-2 pb-2">
                      <p className="text-[9px] text-dm leading-tight line-clamp-1">{scene.prompt}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CENTER: Preview ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Preview area */}
          <div
            className="relative flex-1 m-1 rounded-xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
          >
            {/* Grid texture */}
            {!isPlaying && (
              <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{ backgroundImage: "linear-gradient(#6b7280 1px,transparent 1px),linear-gradient(90deg,#6b7280 1px,transparent 1px)", backgroundSize: "40px 40px" }}
              />
            )}

            {/* Image bg */}
            {!isPlaying && activeScene?.imageUrl && activeScene.status === "idle" && (
              <img src={activeScene.imageUrl} className="absolute inset-0 w-full h-full object-contain opacity-30" alt="" />
            )}

            {/* Video */}
            {isPlaying && <video src={activeScene.videoUrl!} controls autoPlay loop className="absolute inset-0 w-full h-full object-contain" />}

            {/* Center overlay */}
            {!isPlaying && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
                {activeScene?.status === "processing" ? (
                  <>
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 rounded-full border-2 border-violet-200" />
                      <div className="absolute inset-0 rounded-full border-2 border-t-violet-500 animate-spin" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-ds">Generating scene {sceneIndex + 1}…</p>
                      <p className="text-xs text-dm mt-1">{fmtTime(activeScene.elapsed)} · Usually 60–90s</p>
                    </div>
                  </>
                ) : activeScene?.status === "submitting" ? (
                  <>
                    <Loader2 size={28} className="animate-spin text-violet-400" strokeWidth={1.5} />
                    <p className="text-sm text-ds font-medium">Submitting…</p>
                  </>
                ) : activeScene?.status === "error" ? (
                  <div className="flex flex-col items-center gap-3 pointer-events-auto">
                    <AlertCircle size={28} className="text-red-400" strokeWidth={1.5} />
                    <p className="text-sm text-red-500 font-medium text-center max-w-xs">{activeScene.errorMsg}</p>
                    <button onClick={() => patchScene(activeId, { status: "idle", errorMsg: null })}
                      className="text-xs text-dm hover:text-ds flex items-center gap-1.5 transition">
                      <RefreshCw size={11} /> Try again
                    </button>
                  </div>
                ) : activeScene?.imageUrl ? (
                  <div className="text-center">
                    <p className="text-sm font-medium text-ds">Image loaded · ready to animate</p>
                    <p className="text-xs text-dm mt-1">Add a prompt and generate</p>
                  </div>
                ) : (
                  <>
                    <div className="relative w-16 h-16 opacity-15">
                      <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: "rgba(40,30,70,0.2)" }} />
                      <div className="absolute inset-y-0 left-1/2 w-px" style={{ background: "rgba(40,30,70,0.2)" }} />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full" style={{ border: "1px solid rgba(40,30,70,0.15)" }} />
                    </div>
                    <p className="text-xl font-light tracking-[0.4em] text-dm uppercase" style={{ fontFamily: "Gilroy" }}>Preview</p>
                    <p className="text-xs text-dm">Enter a prompt · or drop an image to animate</p>
                  </>
                )}
              </div>
            )}

            {/* Corner badges */}
            {!isPlaying && (
              <>
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-ds" style={{ background: "rgba(255,255,255,0.6)" }}>{aspectRatio}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-ds" style={{ background: "rgba(255,255,255,0.6)" }}>{duration}s</span>
                  {provider === "kling" && mode === "pro" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-50/80 text-violet-600">PRO</span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${provider === "pika" ? "bg-pink-50/80 text-pink-600" : ""}`} style={provider !== "pika" ? { background: "rgba(255,255,255,0.6)" } : {}}>
                    {provider === "kling" ? "Kling" : "Pika"}
                  </span>
                </div>
                <div className="absolute top-3 right-3 text-[10px] font-semibold text-dm px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.6)" }}>
                  ~${cost.toFixed(2)}
                </div>
              </>
            )}

            {/* Done actions */}
            {isPlaying && (
              <div className="absolute bottom-3 right-3 flex gap-2 z-10">
                <a href={activeScene.videoUrl!} download="video.mp4" target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-dp transition" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}>
                  <Download size={11} /> Download
                </a>
                <button onClick={() => patchScene(activeId, { status: "idle", videoUrl: null })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-dp transition" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)" }}>
                  <RefreshCw size={11} /> Redo
                </button>
              </div>
            )}
          </div>

          {/* ── Playback bar ─────────────────────────────────────────── */}
          <div
            className="flex items-center gap-3 mx-1 mb-1 px-4 py-2 rounded-xl shrink-0"
            style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(12px)" }}
          >
            <Clock size={12} className="text-dm" />
            <span className="text-[11px] font-medium text-ds">Duration</span>
            <span className="text-[11px] font-bold font-mono text-dp px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.2)" }}>
              {fmtTime(activeScene?.elapsed ?? 0)}
            </span>

            <div className="flex-1" />

            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-lg text-dm hover:text-ds transition"><SkipBack size={13} /></button>
              <button
                onClick={() => canGenerate ? generateScene(activeId) : undefined}
                className="p-2 rounded-full transition"
                style={{ background: "rgba(255,255,255,0.25)", color: canGenerate ? "#4a3888" : "rgba(40,30,70,0.3)" }}
              >
                {activeScene?.status === "submitting" || activeScene?.status === "processing"
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Play size={14} fill="currentColor" />}
              </button>
              <button className="p-1.5 rounded-lg text-dm hover:text-ds transition"><SkipForward size={13} /></button>
            </div>

            <div className="flex-1" />

            <button className="p-1.5 rounded-lg text-dm hover:text-ds transition"><ZoomIn size={14} /></button>
            <button className="p-1.5 rounded-lg text-dm hover:text-ds transition"><Volume2 size={14} /></button>
          </div>
        </div>

        {/* ── RIGHT: Scene settings ───────────────────────────────────── */}
        <div
          className="w-48 shrink-0 flex flex-col overflow-y-auto"
          style={{ borderLeft: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)" }}
        >
          <div className="px-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
            <p className="text-[10px] font-bold text-ds uppercase tracking-widest">Scene Settings</p>
          </div>

          {/* ── STEP 1: What are you filming? (auto-routes engine) ── */}
          <div className="px-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[10px] font-bold text-dm mb-2">What are you filming?</p>
            <div className="flex flex-col gap-1">
              {(Object.entries(CONTENT_LABELS) as [ContentType, typeof CONTENT_LABELS[NonNullable<ContentType>]][]).map(([ct, info]) => (
                <button
                  key={ct}
                  onClick={() => pickContentType(ct)}
                  className="w-full text-left px-2.5 py-2 rounded-lg transition"
                  style={{
                    background: contentType === ct ? "rgba(100,60,180,0.12)" : "rgba(255,255,255,0.07)",
                    border: contentType === ct ? "1px solid rgba(100,60,180,0.25)" : "1px solid transparent",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-ds">{info.icon} {info.label}</span>
                    <span className="text-[8px] font-bold" style={{ color: "#7050b0" }}>{info.hint}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── STEP 2: Engine (auto-selected or manually overridden) ── */}
          <div className="px-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-dm">Engine</p>
              <div className="flex items-center gap-1">
                {manualOverride ? (
                  <button onClick={resetToAuto}
                    className="text-[8px] font-semibold px-1.5 py-0.5 rounded transition hover:opacity-80"
                    style={{ background: "rgba(220,100,60,0.12)", color: "#c05030" }}>
                    ✏️ manual · reset
                  </button>
                ) : (
                  <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(60,160,80,0.12)", color: "#308050" }}>
                    ✦ auto
                  </span>
                )}
                {activeScene?.lockedEngine && (
                  <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(100,60,180,0.12)", color: "#6040c0" }}>
                    🔒 {activeScene.lockedEngine}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {([
                { id: "higgsfield" as Provider, label: "Higgsfield",  bg: "rgba(120,80,200,0.12)", border: "rgba(120,80,200,0.3)",  color: "#6040c0" },
                { id: "kling"      as Provider, label: "Kling 2.6",   bg: "rgba(40,120,200,0.12)", border: "rgba(40,120,200,0.3)",  color: "#2060a0" },
                { id: "pika"       as Provider, label: "Pika 2.0",    bg: "rgba(200,60,140,0.12)", border: "rgba(200,60,140,0.3)",  color: "#a03080" },
              ]).map(eng => (
                <button key={eng.id} onClick={() => pickEngine(eng.id)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg transition"
                  style={{
                    background: provider === eng.id ? eng.bg : "rgba(255,255,255,0.06)",
                    border: provider === eng.id ? `1px solid ${eng.border}` : "1px solid transparent",
                  }}>
                  <span className="text-[10px] font-bold" style={{ color: provider === eng.id ? eng.color : undefined }}>
                    {eng.label}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[8px] text-dm mt-2 leading-relaxed">
              Locks to this engine when you hit Generate. Won't change mid-video.
            </p>
          </div>

          {/* Timer / Duration */}
          <div className="px-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[10px] font-bold text-dm mb-2">Timer</p>
            <div className="flex gap-1.5">
              {(["5","10"] as Duration[]).map(d => (
                <button key={d} onClick={() => setDuration(d)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition ${duration === d ? "bg-violet-50 text-violet-700" : "text-dm"}`}
                  style={duration !== d ? { background: "rgba(255,255,255,0.1)" } : {}}>
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Quality (Kling only) */}
          {provider === "kling" && (
            <div className="px-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-[10px] font-bold text-dm mb-2">Quality</p>
              <div className="flex gap-1.5">
                {(["pro","std"] as Mode[]).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition ${mode === m ? "bg-violet-50 text-violet-700" : "text-dm"}`}
                    style={mode !== m ? { background: "rgba(255,255,255,0.1)" } : {}}>
                    {m === "pro" ? "Pro" : "Std"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Aspect Ratio */}
          <div className="px-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[10px] font-bold text-dm mb-2">Ratio</p>
            <div className="flex flex-col gap-1">
              {(["9:16","1:1","16:9"] as AspectRatio[]).map(r => (
                <button key={r} onClick={() => setAspectRatio(r)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition ${
                    aspectRatio === r ? "bg-violet-50 text-violet-700" : "text-ds"
                  }`}
                  style={aspectRatio !== r ? { background: "rgba(255,255,255,0.08)" } : {}}>
                  <span>{r}</span>
                  <span className="text-[9px] text-dm">{r==="9:16"?"Reels":r==="1:1"?"Square":"Wide"}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cost */}
          <div className="px-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[10px] font-bold text-dm mb-1">Est. Cost</p>
            <p className="text-lg font-bold text-dh">${cost.toFixed(2)}</p>
            <p className="text-[9px] text-dm">{scenes.length} scene{scenes.length > 1 ? "s" : ""} = ~${(cost * scenes.length).toFixed(2)}</p>
          </div>

          {/* Status */}
          <div className="px-3 py-3">
            {activeScene?.status === "idle"       && <span className="text-[10px] text-dm flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-gray-300" />Ready</span>}
            {activeScene?.status === "submitting" && <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1.5"><Loader2 size={10} className="animate-spin" />Submitting…</span>}
            {activeScene?.status === "processing" && <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1.5"><Clock size={10} />{fmtTime(activeScene.elapsed)}</span>}
            {activeScene?.status === "done"       && <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1.5"><CheckCircle2 size={10} />Complete</span>}
            {activeScene?.status === "error"      && <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1.5"><AlertCircle size={10} />Failed</span>}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BOTTOM PANEL: Prompt | Settings/Camera/FX | Timeline
          ════════════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 flex" style={{ height: "170px", borderTop: "1px solid rgba(255,255,255,0.15)" }}>

        {/* ── Left: Prompt & Generate ─────────────────────────────────── */}
        <div className="w-72 shrink-0 flex flex-col" style={{ borderRight: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <span className="text-[10px] font-bold text-ds uppercase tracking-widest">Prompt</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded">
                Scene {sceneIndex + 1}
              </span>
              {activeScene?.imageUrl && (
                <span className="text-[9px] font-semibold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <ImagePlus size={8} /> i2v
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col px-3 py-2 gap-2">
            <div className="flex gap-2 flex-1">
              {/* Image attach */}
              <div className="shrink-0">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
                {activeScene?.imageUrl ? (
                  <div className="relative w-9 h-9 rounded-lg overflow-hidden group" style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
                    <img src={activeScene.imageUrl} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => patchScene(activeId, { imageUrl: null })}
                      className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                      <Trash2 size={10} className="text-white" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} title="Attach image"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-dm hover:text-violet-400 transition"
                    style={{ border: "1px dashed rgba(255,255,255,0.2)" }}>
                    <ImagePlus size={13} />
                  </button>
                )}
              </div>
              {/* Textarea */}
              <textarea
                rows={4}
                value={activeScene?.prompt ?? ""}
                onChange={e => patchScene(activeId, { prompt: e.target.value })}
                placeholder={activeScene?.imageUrl
                  ? "Describe how to animate this image…"
                  : "Describe this scene…"}
                className="flex-1 bg-transparent text-xs text-dp placeholder:text-dm resize-none outline-none leading-relaxed"
              />
            </div>

            {/* Bottom row: char count + generate */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-dm">{(activeScene?.prompt ?? "").length}/2500</span>
              <button
                onClick={() => generateScene(activeId)}
                disabled={!canGenerate}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all ${
                  canGenerate
                    ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md hover:shadow-lg hover:scale-[1.02]"
                    : "text-dm cursor-not-allowed"
                }`}
                style={!canGenerate ? { background: "rgba(255,255,255,0.1)" } : {}}
              >
                {activeScene?.status === "submitting" || activeScene?.status === "processing"
                  ? <><Loader2 size={11} className="animate-spin" /> Generating</>
                  : <><Sparkles size={11} /> Generate</>}
              </button>
            </div>
          </div>
        </div>

        {/* ── Middle: Camera / FX / Settings tabs ─────────────────────── */}
        <div className="w-72 shrink-0 flex flex-col" style={{ borderRight: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)" }}>
          {/* Tab bar */}
          <div className="flex shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            {([
              { id: "settings" as BottomTab, icon: <Settings2 size={11} />, label: "Settings" },
              { id: "camera"   as BottomTab, icon: <Camera    size={11} />, label: "Camera",  hidden: provider !== "kling" },
              { id: "fx"       as BottomTab, icon: <Wand2     size={11} />, label: "FX",      hidden: provider !== "pika" },
            ])
              .filter(t => !t.hidden)
              .map(t => (
                <button
                  key={t.id}
                  onClick={() => setBottomTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-semibold transition ${
                    bottomTab === t.id ? "text-violet-600" : "text-dm hover:text-ds"
                  }`}
                  style={bottomTab === t.id ? { borderBottom: "2px solid #7c5cc4" } : { borderBottom: "2px solid transparent" }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {/* Settings */}
            {bottomTab === "settings" && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[9px] font-semibold text-dm uppercase tracking-widest flex items-center gap-1">
                      <SlidersHorizontal size={8} /> Prompt Strength
                    </p>
                    <span className="text-[10px] font-bold text-dp">{cfgScale.toFixed(1)}</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.1" value={cfgScale}
                    onChange={e => setCfgScale(parseFloat(e.target.value))}
                    className="w-full accent-violet-500 cursor-pointer" />
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[8px] text-dm">Creative</span>
                    <span className="text-[8px] text-dm">Strict</span>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-dm uppercase tracking-widest mb-1.5">Negative Prompt</p>
                  <textarea rows={3} value={negPrompt} onChange={e => setNegPrompt(e.target.value)}
                    className="w-full rounded-lg px-2.5 py-1.5 text-[10px] text-ds resize-none outline-none transition"
                    style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)" }} />
                </div>
              </div>
            )}

            {/* Camera (Kling) */}
            {bottomTab === "camera" && provider === "kling" && (
              <div>
                <p className="text-[9px] font-semibold text-dm uppercase tracking-widest mb-2">Camera Movement</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {CAMERA_PRESETS.map(p => (
                    <button key={p.type} onClick={() => setCameraType(p.type)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-semibold transition ${
                        cameraType === p.type ? "bg-sky-50 text-sky-700" : "text-ds"
                      }`}
                      style={cameraType !== p.type ? { background: "rgba(255,255,255,0.08)" } : {}}>
                      <span className="text-sm leading-none">{p.icon}</span>
                      <span className="text-[8px]">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* FX (Pika) */}
            {bottomTab === "fx" && provider === "pika" && (
              <div>
                <p className="text-[9px] font-semibold text-dm uppercase tracking-widest mb-2">Pikaffects</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PIKA_EFFECTS.map(fx => (
                    <button key={fx.value} onClick={() => setPikaffect(fx.value)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold transition text-left ${
                        pikaffect === fx.value ? "bg-fuchsia-50 text-fuchsia-700" : "text-ds"
                      }`}
                      style={pikaffect !== fx.value ? { background: "rgba(255,255,255,0.08)" } : {}}>
                      <span className={fx.color || "text-dm"}>{fx.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Vertical tab strip (decorative, matching reference) ────── */}
        <div className="w-8 shrink-0 flex flex-col items-center py-2 gap-2" style={{ borderRight: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}>
          {["Settings", "Inputs", "Effects"].map((label, i) => (
            <div key={label} className="flex items-center justify-center w-full py-3" style={i === 0 ? { background: "rgba(255,255,255,0.12)", borderRadius: "4px" } : {}}>
              <span className="text-[7px] font-semibold text-dm" style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Right: Video Animation / Timeline ───────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center px-3 py-2 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <span className="text-[10px] font-bold text-ds uppercase tracking-widest">Video Animation</span>
          </div>

          <div className="flex-1 relative overflow-hidden px-3 py-2">
            {/* Time markers */}
            <div className="flex items-center gap-0 mb-2 overflow-hidden">
              {Array.from({ length: 12 }, (_, i) => {
                const sec = i * 0.5;
                const label = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String((sec % 1 === 0 ? sec : sec).toFixed(2)).replace(".", ":")}`;
                return (
                  <span key={i} className={`text-[8px] font-mono shrink-0 w-12 ${i === 4 ? "font-bold text-ds" : "text-dm"}`}>
                    {fmtTime(Math.floor(i * (parseInt(duration) / 11)))}
                  </span>
                );
              })}
            </div>

            {/* Keyframe rows (decorative) */}
            {[0, 1, 2, 3].map(row => (
              <div key={row} className="flex items-center h-6 relative">
                <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                {[2, 4, 5, 7, 9].map(col => (
                  <div
                    key={col}
                    className="absolute w-2 h-2 rotate-45"
                    style={{
                      left: `${(col / 11) * 100}%`,
                      top: "50%",
                      transform: "translate(-50%, -50%) rotate(45deg)",
                      background: col === 4 + row ? "rgba(120,80,200,0.6)" : "rgba(255,255,255,0.25)",
                    }}
                  />
                ))}
              </div>
            ))}

            {/* Playhead line */}
            <div className="absolute top-0 bottom-0 w-px" style={{ left: "38%", background: "rgba(120,80,200,0.5)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VideoStudioPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh]" />}>
      <VideoStudioPageContent />
    </Suspense>
  );
}
