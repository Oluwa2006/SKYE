"use client";

import { useState, useEffect, useRef } from "react";
import { UploadSimple, X, Check, CircleNotch, Plus } from "@phosphor-icons/react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={`relative rounded-full transition-colors ${enabled ? "bg-violet-800" : "bg-gray-200"}`} style={{ height: "22px", width: "40px" }}>
      <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full glass-card shadow transition-transform" style={{ transform: enabled ? "translateX(18px)" : "translateX(0)" }} />
    </button>
  );
}

function SettingRow({ label, description, enabled, onChange }: { label: string; description: string; enabled: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-glass-soft last:border-0">
      <div>
        <p className="text-sm font-medium text-dp">{label}</p>
        <p className="text-xs text-dm mt-0.5">{description}</p>
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  );
}

async function saveSetting(key: string, value: string) {
  await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value }) });
}

// ─── Image Upload Button ───────────────────────────────────────────────────────
function ImageUpload({ value, onChange, label, folder = "brand" }: { value: string; onChange: (url: string) => void; label: string; folder?: string }) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const res  = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) onChange(data.url);
    setUploading(false);
  }

  return (
    <div>
      <p className="text-[10px] font-semibold text-ds uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative group">
            <img src={value} className="w-16 h-16 rounded-xl object-cover border border-glass" />
            <button onClick={() => onChange("")} className="absolute -top-1.5 -right-1.5 w-5 h-5 glass-card border border-glass rounded-full flex items-center justify-center text-dm hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition">
              <X size={10} weight="regular" />
            </button>
          </div>
        ) : null}
        <button
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-glass text-xs font-semibold text-dm hover:border-gray-400 hover:text-ds transition disabled:opacity-40"
        >
          {uploading ? <CircleNotch size={13} weight="regular" className="animate-spin" /> : <UploadSimple size={13} weight="regular" />}
          {uploading ? "Uploading..." : value ? "Replace" : "Upload"}
        </button>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

// ─── Multi-photo gallery ───────────────────────────────────────────────────────
function PhotoGallery({ photos, onChange }: { photos: string[]; onChange: (photos: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 5 - photos.length);
    if (!files.length) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "products");
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) urls.push(data.url);
    }
    onChange([...photos, ...urls]);
    setUploading(false);
  }

  return (
    <div>
      <p className="text-[10px] font-semibold text-ds uppercase tracking-widest mb-2">Product / Brand Photos <span className="normal-case font-normal">(up to 5 — used in ads automatically)</span></p>
      <div className="flex gap-2 flex-wrap">
        {photos.map((url, i) => (
          <div key={i} className="relative group">
            <img src={url} className="w-20 h-20 rounded-xl object-cover border border-glass" />
            <button onClick={() => onChange(photos.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 glass-card border border-glass rounded-full flex items-center justify-center text-dm hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition">
              <X size={10} weight="regular" />
            </button>
          </div>
        ))}
        {photos.length < 5 && (
          <button onClick={() => ref.current?.click()} disabled={uploading}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-glass flex flex-col items-center justify-center gap-1 text-dm hover:border-gray-400 hover:text-ds transition disabled:opacity-40">
            {uploading ? <CircleNotch size={16} className="animate-spin" /> : <Plus size={18} />}
            <span className="text-[9px] font-semibold">{uploading ? "..." : "Add"}</span>
          </button>
        )}
        <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      </div>
    </div>
  );
}

const FONT_OPTIONS = [
  { value: "inter",       label: "Inter",           preview: "Clean & Modern" },
  { value: "poppins",     label: "Poppins",         preview: "Friendly & Rounded" },
  { value: "montserrat",  label: "Montserrat",      preview: "Bold & Strong" },
  { value: "playfair",    label: "Playfair Display", preview: "Elegant & Luxury" },
  { value: "bebas",       label: "Bebas Neue",      preview: "IMPACT & ENERGY" },
  { value: "oswald",      label: "Oswald",          preview: "Tall & Athletic" },
];

const MUSIC_OPTIONS = [
  { value: "none",      label: "No music",     emoji: "🔇" },
  { value: "upbeat",    label: "Upbeat",       emoji: "⚡" },
  { value: "chill",     label: "Chill & Warm", emoji: "🌊" },
  { value: "dramatic",  label: "Dramatic",     emoji: "🎯" },
  { value: "luxury",    label: "Luxury",       emoji: "✨" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  // Toggles
  const [autoPipeline,  setAutoPipeline]  = useState(true);
  const [autoSync,      setAutoSync]      = useState(true);
  const [voiceDefault,  setVoiceDefault]  = useState(false);
  const [notifications, setNotifications] = useState(false);

  // Brand Kit
  const [brandName,     setBrandName]     = useState("");
  const [brandVoice,    setBrandVoice]    = useState("");
  const [primaryColor,  setPrimaryColor]  = useState("#6d28d9");
  const [accentColor,   setAccentColor]   = useState("#a78bfa");
  const [logoUrl,       setLogoUrl]       = useState("");
  const [brandFont,     setBrandFont]     = useState("inter");
  const [musicVibe,     setMusicVibe]     = useState("upbeat");
  const [brandPhotos,   setBrandPhotos]   = useState<string[]>([]);

  const [loaded,  setLoaded]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  // Danger zone
  const [clearingPosts, setClearingPosts] = useState(false);
  const [clearPostsMsg, setClearPostsMsg] = useState("");
  const [clearingIdeas, setClearingIdeas] = useState(false);
  const [clearIdeasMsg, setClearIdeasMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(data => {
      if (data.auto_pipeline !== undefined)  setAutoPipeline(data.auto_pipeline === "true");
      if (data.auto_sync !== undefined)      setAutoSync(data.auto_sync === "true");
      if (data.voice_default !== undefined)  setVoiceDefault(data.voice_default === "true");
      if (data.notifications !== undefined)  setNotifications(data.notifications === "true");
      if (data.profile_brand)     setBrandName(data.profile_brand);
      if (data.brand_voice)       setBrandVoice(data.brand_voice);
      if (data.brand_primary)     setPrimaryColor(data.brand_primary);
      if (data.brand_accent)      setAccentColor(data.brand_accent);
      if (data.brand_logo_url)    setLogoUrl(data.brand_logo_url);
      if (data.brand_font)        setBrandFont(data.brand_font);
      if (data.brand_music_vibe)  setMusicVibe(data.brand_music_vibe);
      if (data.brand_photos)      { try { setBrandPhotos(JSON.parse(data.brand_photos)); } catch {} }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  function toggleSetting(key: string, current: boolean, setter: (v: boolean) => void) {
    const next = !current;
    setter(next);
    saveSetting(key, String(next));
  }

  async function saveBrandKit() {
    setSaving(true);
    await Promise.all([
      saveSetting("profile_brand",    brandName),
      saveSetting("brand_voice",      brandVoice),
      saveSetting("brand_primary",    primaryColor),
      saveSetting("brand_accent",     accentColor),
      saveSetting("brand_logo_url",   logoUrl),
      saveSetting("brand_font",       brandFont),
      saveSetting("brand_music_vibe", musicVibe),
      saveSetting("brand_photos",     JSON.stringify(brandPhotos)),
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleClearPosts() {
    if (!confirm("Delete all posts and analyses? This cannot be undone.")) return;
    setClearingPosts(true);
    try {
      const res = await fetch("/api/posts/delete", { method: "DELETE" });
      const data = await res.json();
      setClearPostsMsg(res.ok ? "Cleared successfully." : data.error ?? "Failed.");
    } catch { setClearPostsMsg("Something went wrong."); }
    setClearingPosts(false);
  }

  async function handleClearIdeas() {
    if (!confirm("Remove all generated ideas? This cannot be undone.")) return;
    setClearingIdeas(true);
    try {
      const res = await fetch("/api/ideas/delete", { method: "DELETE" });
      const data = await res.json();
      setClearIdeasMsg(res.ok ? "Ideas reset." : data.error ?? "Failed.");
    } catch { setClearIdeasMsg("Something went wrong."); }
    setClearingIdeas(false);
  }

  if (!loaded) return (
    <div className="p-8 max-w-2xl mx-auto space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-24 glass-sub rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#1e1038", fontFamily: "var(--font-syne)" }}>Settings</h1>
        <p className="text-sm text-dm mt-1">Configure SKYE and your brand kit</p>
      </div>

      {/* ── Brand Kit ──────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-ds uppercase tracking-widest">Brand Kit</p>
          <p className="text-[10px] text-dm">Used in all AI-generated ads, copy, and DMs</p>
        </div>

        {/* Name + voice */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-ds uppercase tracking-widest block mb-1.5">Brand Name</label>
            <input value={brandName} onChange={e => setBrandName(e.target.value)}
              placeholder="e.g. Goldline Eats"
              className="w-full rounded-xl border border-glass glass-sub px-3 py-2.5 text-sm text-dp placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:glass-card transition" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-ds uppercase tracking-widest block mb-1.5">Brand Voice</label>
            <input value={brandVoice} onChange={e => setBrandVoice(e.target.value)}
              placeholder="e.g. bold, warm, premium"
              className="w-full rounded-xl border border-glass glass-sub px-3 py-2.5 text-sm text-dp placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:glass-card transition" />
          </div>
        </div>

        {/* Colors */}
        <div>
          <p className="text-[10px] font-semibold text-ds uppercase tracking-widest mb-2.5">Brand Colors</p>
          <div className="flex gap-6">
            <div className="flex items-center gap-3">
              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-xl border border-glass cursor-pointer p-0.5" />
              <div>
                <p className="text-xs font-semibold text-dp">Primary</p>
                <p className="text-[10px] text-dm font-mono">{primaryColor}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                className="w-10 h-10 rounded-xl border border-glass cursor-pointer p-0.5" />
              <div>
                <p className="text-xs font-semibold text-dp">Accent</p>
                <p className="text-[10px] text-dm font-mono">{accentColor}</p>
              </div>
            </div>
            {/* Live preview */}
            <div className="ml-auto flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg" style={{ background: primaryColor }} />
              <div className="w-8 h-8 rounded-lg" style={{ background: accentColor }} />
              <div className="w-24 h-8 rounded-lg" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }} />
            </div>
          </div>
        </div>

        {/* Logo */}
        <ImageUpload value={logoUrl} onChange={url => setLogoUrl(url)} label="Brand Logo" folder="brand" />

        {/* Product photos */}
        <PhotoGallery photos={brandPhotos} onChange={photos => { setBrandPhotos(photos); }} />

        {/* Font */}
        <div>
          <p className="text-[10px] font-semibold text-ds uppercase tracking-widest mb-2.5">Ad Font</p>
          <div className="grid grid-cols-3 gap-2">
            {FONT_OPTIONS.map(f => (
              <button key={f.value} onClick={() => setBrandFont(f.value)}
                className={`px-3 py-2.5 rounded-xl border text-left transition ${brandFont === f.value ? "border-gray-900 bg-violet-800 text-white" : "border-glass glass-sub hover:border-gray-300 text-dp"}`}>
                <p className="text-xs font-bold">{f.label}</p>
                <p className={`text-[10px] mt-0.5 ${brandFont === f.value ? "text-dm" : "text-dm"}`}>{f.preview}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Music vibe */}
        <div>
          <p className="text-[10px] font-semibold text-ds uppercase tracking-widest mb-2.5">Ad Music Vibe</p>
          <div className="flex gap-2 flex-wrap">
            {MUSIC_OPTIONS.map(m => (
              <button key={m.value} onClick={() => setMusicVibe(m.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition ${musicVibe === m.value ? "border-gray-900 bg-violet-800 text-white" : "border-glass glass-sub text-ds hover:border-gray-300"}`}>
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button onClick={saveBrandKit} disabled={saving}
          className={`w-full py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${saved ? "bg-emerald-500 text-white" : "bg-violet-800 text-white hover:bg-violet-700 disabled:opacity-50"}`}>
          {saving ? <><CircleNotch size={14} className="animate-spin" /> Saving...</> : saved ? <><Check size={14} /> Saved!</> : "Save Brand Kit"}
        </button>
      </div>

      {/* ── Pipeline ───────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6">
        <p className="text-xs font-semibold text-ds uppercase tracking-widest mb-1">Pipeline</p>
        <SettingRow label="Auto-run pipeline daily" description="Automatically scrapes, analyses, and generates ideas every day at 8 AM UTC." enabled={autoPipeline} onChange={() => toggleSetting("auto_pipeline", autoPipeline, setAutoPipeline)} />
        <SettingRow label="Auto-sync social accounts" description="Refreshes follower counts for Instagram accounts every 30 minutes." enabled={autoSync} onChange={() => toggleSetting("auto_sync", autoSync, setAutoSync)} />
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6">
        <p className="text-xs font-semibold text-ds uppercase tracking-widest mb-1">Content</p>
        <SettingRow label="Auto-generate voice on approval" description="Generates a voiceover script automatically when an idea is approved." enabled={voiceDefault} onChange={() => toggleSetting("voice_default", voiceDefault, setVoiceDefault)} />
        <SettingRow label="Email notifications" description="Get notified when a pipeline run completes or fails." enabled={notifications} onChange={() => toggleSetting("notifications", notifications, setNotifications)} />
      </div>

      {/* ── Danger Zone ─────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <p className="text-xs font-semibold text-ds uppercase tracking-widest">Danger Zone</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-dp">Clear all posts</p>
            <p className="text-xs text-dm mt-0.5">Deletes all scraped posts and analyses. Cannot be undone.</p>
            {clearPostsMsg && <p className="text-xs text-dm mt-1">{clearPostsMsg}</p>}
          </div>
          <button onClick={handleClearPosts} disabled={clearingPosts} className="px-4 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 transition disabled:opacity-40 shrink-0 ml-4">
            {clearingPosts ? "Clearing..." : "Clear Posts"}
          </button>
        </div>
        <div className="flex items-center justify-between border-t border-glass-soft pt-5">
          <div>
            <p className="text-sm font-medium text-dp">Reset all ideas</p>
            <p className="text-xs text-dm mt-0.5">Removes all generated ideas. Sources and analyses are kept.</p>
            {clearIdeasMsg && <p className="text-xs text-dm mt-1">{clearIdeasMsg}</p>}
          </div>
          <button onClick={handleClearIdeas} disabled={clearingIdeas} className="px-4 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 transition disabled:opacity-40 shrink-0 ml-4">
            {clearingIdeas ? "Resetting..." : "Reset Ideas"}
          </button>
        </div>
      </div>
    </div>
  );
}
