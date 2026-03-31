"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, X, Instagram, Copy, RefreshCw,
  Users, TrendingUp, Star, DollarSign, Check,
  AlertCircle, ChevronRight, Search, ExternalLink,
  BadgeCheck, Lock, Sparkles, Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type PipelineStage =
  | "Discovered"
  | "Contacted"
  | "Responded"
  | "Deal Sent"
  | "Content Live"
  | "Complete";

export interface Creator {
  id: string;
  handle: string;
  name?: string;
  platform: string;
  profile_photo_url?: string;
  location?: string;
  followers: number;
  engagement_rate: number;
  avg_views: number;
  posts_per_week: number;
  niche_tags: string[];
  brand_fit_score: number;
  est_cost_min: number;
  est_cost_max: number;
  pipeline_stage: PipelineStage;
  agreed_rate?: number;
  deal_notes?: string;
  due_date?: string;
  added_at: string;
  last_updated: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGES: PipelineStage[] = [
  "Discovered", "Contacted", "Responded", "Deal Sent", "Content Live", "Complete",
];

const STAGE_COLORS: Record<PipelineStage, { bg: string; text: string; dot: string }> = {
  Discovered:     { bg: "bg-white/10",       text: "text-ds",          dot: "#9ca3af" },
  Contacted:      { bg: "bg-blue-400/20",    text: "text-blue-700",    dot: "#3b82f6" },
  Responded:      { bg: "bg-violet-400/20",  text: "text-violet-700",  dot: "#7c3aed" },
  "Deal Sent":    { bg: "bg-amber-400/20",  text: "text-amber-700",   dot: "#d97706" },
  "Content Live": { bg: "bg-emerald-400/20",text: "text-emerald-700", dot: "#059669" },
  Complete:       { bg: "bg-teal-400/20",    text: "text-teal-700",    dot: "#0d9488" },
};

const PLATFORM_COLOR: Record<string, string> = {
  instagram: "#e1306c",
  tiktok:    "#010101",
  youtube:   "#ff0000",
  twitter:   "#1da1f2",
  other:     "#6b7280",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return String(n);
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function estimateCost(followers: number, engagementRate: number): { min: number; max: number } {
  let min: number, max: number;
  if (followers < 10_000)       { min = 10;    max = 100;   }
  else if (followers < 100_000) { min = 100;   max = 500;   }
  else if (followers < 500_000) { min = 500;   max = 5000;  }
  else                          { min = 5000;  max = 20000; }

  const multiplier = engagementRate > 5 ? 1.2 : engagementRate < 1 ? 0.7 : 1;
  return { min: Math.round(min * multiplier), max: Math.round(max * multiplier) };
}

function openInstagramDM(handle: string) {
  const cleanHandle = handle.replace(/^@/, "");
  const isMobile = /iPhone|Android/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = `instagram://user?username=${cleanHandle}`;
    setTimeout(() => window.open(`https://ig.me/m/${cleanHandle}`, "_blank"), 500);
  } else {
    window.open(`https://ig.me/m/${cleanHandle}`, "_blank");
  }
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ creator, size = 36 }: { creator: Creator; size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const color  = PLATFORM_COLOR[creator.platform] ?? "#6b7280";
  const letter = (creator.name || creator.handle).charAt(0).toUpperCase();
  const handle = creator.handle.replace(/^@/, "");

  // Priority: explicit URL → unavatar.io → initials
  const src = creator.profile_photo_url
    ? creator.profile_photo_url
    : `https://unavatar.io/instagram/${handle}`;

  if (!imgFailed) {
    return (
      <img
        src={src}
        alt={handle}
        width={size}
        height={size}
        onError={() => setImgFailed(true)}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  // Final fallback — initials
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}
    >
      {letter}
    </div>
  );
}



// ─── Add Creator Form ─────────────────────────────────────────────────────────
function AddCreatorModal({ onClose, onSave }: { onClose: () => void; onSave: (c: Omit<Creator, "id" | "added_at" | "last_updated">) => void }) {
  const [form, setForm] = useState({
    handle: "", name: "", platform: "instagram", location: "",
    profile_photo_url: "",
    followers: 0, engagement_rate: 0, avg_views: 0, posts_per_week: 0,
    niche_tags_raw: "", brand_fit_score: 0,
    est_cost_min: 0, est_cost_max: 0,
    pipeline_stage: "Discovered" as PipelineStage,
  });

  function f(key: string, val: string | number) {
    setForm(prev => {
      const next = { ...prev, [key]: val };
      // Auto-compute est cost from followers + engagement
      if (key === "followers" || key === "engagement_rate") {
        const { min, max } = estimateCost(
          key === "followers" ? Number(val) : next.followers,
          key === "engagement_rate" ? Number(val) : next.engagement_rate,
        );
        next.est_cost_min = min;
        next.est_cost_max = max;
      }
      return next;
    });
  }

  function handleSave() {
    if (!form.handle.trim()) return;
    const niche_tags = form.niche_tags_raw.split(",").map(t => t.trim()).filter(Boolean);
    onSave({
      handle: form.handle.trim().replace(/^@/, ""),
      name: form.name || undefined,
      platform: form.platform,
      location: form.location || undefined,
      profile_photo_url: form.profile_photo_url || undefined,
      followers: form.followers,
      engagement_rate: form.engagement_rate,
      avg_views: form.avg_views,
      posts_per_week: form.posts_per_week,
      niche_tags,
      brand_fit_score: form.brand_fit_score,
      est_cost_min: form.est_cost_min,
      est_cost_max: form.est_cost_max,
      pipeline_stage: form.pipeline_stage,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-card rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-dh">Add Creator</p>
          <button onClick={onClose} className="text-dm hover:text-ds transition"><X size={16} /></button>
        </div>

        {/* Basic info */}
        <div>
          <p className="text-[10px] font-semibold text-dm uppercase tracking-widest mb-3">Basic Info</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: "handle", label: "Instagram Handle *", placeholder: "@hydfoodguy" },
              { key: "name",   label: "Display Name",        placeholder: "e.g. Rohan K" },
            ] as const).map(({ key, label, placeholder }) => (
              <div key={key} className="col-span-1">
                <label className="text-[10px] font-semibold text-dm uppercase tracking-widest block mb-1">{label}</label>
                <input
                  value={(form as any)[key]}
                  onChange={e => f(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-glass glass-sub px-3 py-2 text-sm text-dp placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:glass-card transition"
                />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-semibold text-dm uppercase tracking-widest block mb-1">Platform</label>
              <select
                value={form.platform}
                onChange={e => f("platform", e.target.value)}
                className="w-full rounded-lg border border-glass glass-sub px-3 py-2 text-sm text-dp focus:outline-none focus:border-gray-400 focus:glass-card transition"
              >
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="twitter">X / Twitter</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-dm uppercase tracking-widest block mb-1">Location</label>
              <input
                value={form.location}
                onChange={e => f("location", e.target.value)}
                placeholder="e.g. Hyderabad"
                className="w-full rounded-lg border border-glass glass-sub px-3 py-2 text-sm text-dp placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:glass-card transition"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-dm uppercase tracking-widest block mb-1">
                Profile Photo URL <span className="normal-case font-normal text-dm">(optional — auto-fetched if blank)</span>
              </label>
              <input
                value={form.profile_photo_url}
                onChange={e => f("profile_photo_url", e.target.value)}
                placeholder="https://... (paste a direct image URL)"
                className="w-full rounded-lg border border-glass glass-sub px-3 py-2 text-sm text-dp placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:glass-card transition"
              />
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div>
          <p className="text-[10px] font-semibold text-dm uppercase tracking-widest mb-3">Metrics</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: "followers",       label: "Followers",          placeholder: "48200" },
              { key: "engagement_rate", label: "Engagement Rate (%)", placeholder: "6.2"  },
              { key: "avg_views",       label: "Avg Views / Reel",   placeholder: "22000" },
              { key: "posts_per_week",  label: "Posts / Week",       placeholder: "4"     },
            ] as const).map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-[10px] font-semibold text-dm uppercase tracking-widest block mb-1">{label}</label>
                <input
                  type="number"
                  value={(form as any)[key] || ""}
                  onChange={e => f(key, Number(e.target.value))}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-glass glass-sub px-3 py-2 text-sm text-dp placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:glass-card transition"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Tags + scoring */}
        <div>
          <p className="text-[10px] font-semibold text-dm uppercase tracking-widest mb-3">Tags & Scoring</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-dm uppercase tracking-widest block mb-1">Niche Tags (comma-separated)</label>
              <input
                value={form.niche_tags_raw}
                onChange={e => f("niche_tags_raw", e.target.value)}
                placeholder="food, street food, hyderabad"
                className="w-full rounded-lg border border-glass glass-sub px-3 py-2 text-sm text-dp placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:glass-card transition"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-dm uppercase tracking-widest block mb-1">Brand Fit Score (1–10)</label>
              <input
                type="number" min="0" max="10" step="0.1"
                value={form.brand_fit_score || ""}
                onChange={e => f("brand_fit_score", Number(e.target.value))}
                placeholder="8.4"
                className="w-full rounded-lg border border-glass glass-sub px-3 py-2 text-sm text-dp placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:glass-card transition"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-dm uppercase tracking-widest block mb-1">Pipeline Stage</label>
              <select
                value={form.pipeline_stage}
                onChange={e => f("pipeline_stage", e.target.value)}
                className="w-full rounded-lg border border-glass glass-sub px-3 py-2 text-sm text-dp focus:outline-none focus:border-gray-400 focus:glass-card transition"
              >
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Auto-computed cost preview */}
          {(form.est_cost_min > 0 || form.est_cost_max > 0) && (
            <p className="text-xs text-dm mt-2.5">
              Est. cost: <span className="font-semibold text-dp">${fmt(form.est_cost_min)}–${fmt(form.est_cost_max)} / post</span>
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-glass text-sm text-ds hover:glass-sub transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.handle.trim()}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition disabled:opacity-40"
          >
            Add Creator
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Discovery Panel ──────────────────────────────────────────────────────────
interface LookedUpCreator {
  handle: string; name: string; platform: string;
  profile_photo_url: string; bio: string;
  followers: number; media_count: number;
  is_verified: boolean;
  engagement_rate: number; avg_views: number; posts_per_week: number;
  niche_tags: string[];
  brand_fit_score: number; est_cost_min: number; est_cost_max: number;
  profile_url: string;
}

function DiscoveryPanel({
  onClose, onAdd,
}: {
  onClose: () => void;
  onAdd: (c: LookedUpCreator) => Promise<void>;
}) {
  const [input, setInput]       = useState("");
  const [state, setState]       = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult]     = useState<LookedUpCreator | null>(null);
  const [errMsg, setErrMsg]     = useState("");
  const [added, setAdded]       = useState(false);
  const [adding, setAdding]     = useState(false);
  const [history, setHistory]   = useState<LookedUpCreator[]>([]);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setState("loading");
    setResult(null);
    setErrMsg("");
    setAdded(false);
    try {
      const res  = await fetch("/api/creators/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setErrMsg(data.error ?? "Lookup failed."); setState("error"); return; }
      setResult(data.creator);
      setState("done");
    } catch {
      setErrMsg("Something went wrong. Check your connection.");
      setState("error");
    }
  }

  async function handleAdd() {
    if (!result) return;
    setAdding(true);
    await onAdd(result);
    setAdded(true);
    setAdding(false);
    setHistory(prev => [result, ...prev.filter(c => c.handle !== result.handle)]);
  }

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-card rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-glass shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
              <Instagram size={14} className="text-pink-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-dh">Look up Creator</p>
              <p className="text-[11px] text-dm">Search a real Instagram handle for live stats</p>
            </div>
          </div>
          <button onClick={onClose} className="text-dm hover:text-ds transition">
            <X size={16} />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-6 pt-5 pb-4 border-b border-glass-soft">
          <form onSubmit={lookup} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dm text-sm font-medium pointer-events-none">@</span>
              <input
                value={input}
                onChange={e => setInput(e.target.value.replace(/^@/, ""))}
                placeholder="handle"
                autoFocus
                className="w-full rounded-xl border border-glass glass-sub pl-7 pr-4 py-2.5 text-sm text-dp outline-none focus:border-gray-400 focus:glass-card transition"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || state === "loading"}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition disabled:opacity-40"
            >
              {state === "loading"
                ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <Search size={14} />}
              Look up
            </button>
          </form>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 max-h-[60vh]">

          {/* Error */}
          {state === "error" && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errMsg}</p>
            </div>
          )}

          {/* Result card */}
          {state === "done" && result && (
            <div className="rounded-xl border border-glass overflow-hidden">
              {/* Profile header */}
              <div className="flex items-center gap-3 p-4 glass-sub">
                {result.profile_photo_url ? (
                  <img
                    src={result.profile_photo_url}
                    alt={result.handle}
                    className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-white shadow"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {result.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-dh">@{result.handle}</p>
                    {result.is_verified && (
                      <BadgeCheck size={14} className="text-blue-500 shrink-0" />
                    )}
                  </div>
                  {result.name && result.name !== result.handle && (
                    <p className="text-xs text-ds">{result.name}</p>
                  )}
                  <a
                    href={result.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-pink-500 hover:text-pink-700 flex items-center gap-0.5 mt-0.5 w-fit"
                  >
                    instagram.com/{result.handle} <ExternalLink size={9} />
                  </a>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 divide-x divide-glass border-t border-glass">
                {[
                  { label: "Followers",  value: fmt(result.followers)  },
                  { label: "Posts",      value: fmt(result.media_count) },
                  { label: "Est. /post", value: `$${fmt(result.est_cost_min)}–$${fmt(result.est_cost_max)}` },
                ].map(({ label, value }) => (
                  <div key={label} className="px-4 py-3 text-center">
                    <p className="text-sm font-bold text-dh">{value}</p>
                    <p className="text-[10px] text-dm font-medium">{label}</p>
                  </div>
                ))}
              </div>

              {/* Bio */}
              {result.bio && (
                <div className="px-4 py-3 border-t border-glass">
                  <p className="text-[11px] text-ds leading-relaxed">{result.bio}</p>
                </div>
              )}

              {/* Niche tags */}
              {result.niche_tags.length > 0 && (
                <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
                  {result.niche_tags.map(tag => (
                    <span key={tag} className="text-[9px] glass-sub border border-glass text-ds px-1.5 py-0.5 rounded font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Add button */}
              <div className="px-4 pb-4 border-t border-glass-soft">
                <button
                  onClick={handleAdd}
                  disabled={added || adding}
                  className={`w-full mt-3 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                    added
                      ? "bg-emerald-50 text-emerald-600 cursor-default"
                      : "bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
                  }`}
                >
                  {added ? (
                    <><Check size={14} /> Added to Pipeline</>
                  ) : adding ? (
                    <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Adding...</>
                  ) : (
                    <>Add to Pipeline</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Idle state hint */}
          {state === "idle" && (
            <div className="text-center py-8">
              <Instagram size={28} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-dm">Enter an Instagram handle above</p>
              <p className="text-xs text-dm mt-1">Live stats pulled directly from Instagram</p>
            </div>
          )}

          {/* Recent lookups */}
          {history.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-semibold text-dm uppercase tracking-widest mb-2">Recent</p>
              <div className="space-y-1.5">
                {history.map(c => (
                  <button
                    key={c.handle}
                    onClick={() => { setInput(c.handle); setResult(c); setState("done"); setAdded(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:glass-sub transition text-left"
                  >
                    {c.profile_photo_url ? (
                      <img src={c.profile_photo_url} className="w-7 h-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-dp">@{c.handle}</span>
                    <span className="text-[10px] text-dm ml-auto">{fmt(c.followers)} followers</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AI Discovery Panel ───────────────────────────────────────────────────────
type AICardState = "loading" | "done" | "error";
interface AICard {
  handle: string;
  state: AICardState;
  creator?: LookedUpCreator;
  error?: string;
  added?: boolean;
}

function AIDiscoveryPanel({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (c: LookedUpCreator) => Promise<void>;
}) {
  const [cards, setCards]         = useState<AICard[]>([]);
  const [aiError, setAiError]     = useState("");
  const [thinking, setThinking]   = useState(true);
  const [brandName, setBrandName] = useState("");
  // Optional refinement filters
  const [showFilters, setShowFilters] = useState(false);
  const [niche, setNiche]             = useState("");
  const [location, setLocation]       = useState("");
  const [followerTier, setFollowerTier] = useState("");

  const doneCount    = cards.filter(c => c.state !== "loading").length;
  const successCards = cards.filter(c => c.state === "done");

  async function run(filters?: { niche?: string; location?: string; followerTier?: string }) {
    setThinking(true);
    setAiError("");
    setCards([]);

    let handles: string[] = [];
    try {
      const res  = await fetch("/api/creators/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters ?? {}),
      });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error ?? "AI failed."); setThinking(false); return; }
      handles = data.handles ?? [];
      if (data.brandName) setBrandName(data.brandName);
    } catch {
      setAiError("Could not reach AI. Check your connection.");
      setThinking(false);
      return;
    }

    setThinking(false);
    setCards(handles.map(h => ({ handle: h, state: "loading" })));

    // Sequential with 1.2s delay to avoid RapidAPI rate-limit (429)
    for (let i = 0; i < handles.length; i++) {
      const handle = handles[i];
      if (i > 0) await new Promise(r => setTimeout(r, 1200));
      try {
        const res  = await fetch("/api/creators/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle }),
        });
        const data = await res.json();
        setCards(prev => prev.map(c => c.handle === handle
          ? res.ok
            ? { ...c, state: "done", creator: data.creator }
            : { ...c, state: "error", error: data.error ?? "Not found" }
          : c));
      } catch {
        setCards(prev => prev.map(c => c.handle === handle
          ? { ...c, state: "error", error: "Lookup failed" }
          : c));
      }
    }
  }

  // Auto-run on mount
  useEffect(() => { run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(handle: string) {
    const card = cards.find(c => c.handle === handle);
    if (!card?.creator) return;
    setCards(prev => prev.map(c => c.handle === handle ? { ...c, added: true } : c));
    await onAdd(card.creator);
  }

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-card rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-glass shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Sparkles size={14} className="text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-dh">Find Creators with AI</p>
              <p className="text-[11px] text-dm">
                {brandName ? `Based on your brand prompt for ${brandName}` : "Based on your brand prompt"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-dm hover:text-ds transition">
            <X size={16} />
          </button>
        </div>

        {/* Optional filter bar */}
        <div className="px-6 pt-3 pb-2 border-b border-glass-soft shrink-0">
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-1.5 text-[11px] text-dm hover:text-ds transition"
          >
            <ChevronRight size={12} className={`transition-transform ${showFilters ? "rotate-90" : ""}`} />
            Refine with filters
          </button>
          {showFilters && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <input
                value={niche} onChange={e => setNiche(e.target.value)}
                placeholder="Niche"
                className="rounded-lg border border-glass glass-sub px-3 py-1.5 text-xs text-dp placeholder-gray-300 outline-none focus:border-gray-400 transition"
              />
              <input
                value={location} onChange={e => setLocation(e.target.value)}
                placeholder="Location"
                className="rounded-lg border border-glass glass-sub px-3 py-1.5 text-xs text-dp placeholder-gray-300 outline-none focus:border-gray-400 transition"
              />
              <select
                value={followerTier} onChange={e => setFollowerTier(e.target.value)}
                className="rounded-lg border border-glass glass-sub px-2 py-1.5 text-xs text-dp outline-none focus:border-gray-400 transition"
              >
                <option value="">Any size</option>
                <option value="nano (1K–10K)">Nano 1K–10K</option>
                <option value="micro (10K–100K)">Micro 10K–100K</option>
                <option value="mid-tier (100K–500K)">Mid 100K–500K</option>
                <option value="macro (500K+)">Macro 500K+</option>
              </select>
              <button
                onClick={() => run({ niche, location, followerTier })}
                className="col-span-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition flex items-center justify-center gap-1.5"
              >
                <Sparkles size={11} /> Re-run with filters
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5">

          {/* Status line */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-dm">
              {thinking
                ? "AI is finding creators for your brand..."
                : cards.length === 0 && aiError ? ""
                : `${doneCount} / ${cards.length} verified`}
            </p>
            {!thinking && cards.length > 0 && (
              <button
                onClick={() => run({ niche, location, followerTier })}
                className="text-[11px] text-violet-500 hover:text-violet-700 transition flex items-center gap-1"
              >
                <Sparkles size={10} /> Refresh
              </button>
            )}
          </div>

          {/* Thinking spinner */}
          {thinking && (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <Loader2 size={22} className="animate-spin text-violet-400" />
              <p className="text-xs text-dm">Scanning for the best fits…</p>
            </div>
          )}

          {/* Error */}
          {!thinking && aiError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-red-700 whitespace-pre-line">{aiError}</p>
                <button
                  onClick={() => run()}
                  className="mt-2 text-[11px] text-red-500 underline hover:text-red-700"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Creator cards */}
          {cards.map(card => (
            <div key={card.handle} className="rounded-xl border border-glass overflow-hidden">
              {card.state === "loading" && (
                <div className="flex items-center gap-3 p-3.5">
                  <div className="w-10 h-10 rounded-full glass-sub animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 glass-sub rounded animate-pulse w-1/3" />
                    <div className="h-2.5 glass-sub rounded animate-pulse w-1/2" />
                  </div>
                  <Loader2 size={13} className="animate-spin text-dm shrink-0" />
                </div>
              )}

              {card.state === "error" && (
                <div className="flex items-center gap-3 px-3.5 py-3 opacity-50">
                  <div className="w-10 h-10 rounded-full glass-sub flex items-center justify-center shrink-0">
                    <Lock size={12} className="text-dm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ds">@{card.handle}</p>
                    <p className="text-[11px] text-dm">{card.error}</p>
                  </div>
                </div>
              )}

              {card.state === "done" && card.creator && (
                <div>
                  <div className="flex items-center gap-3 p-3.5 glass-sub">
                    {card.creator.profile_photo_url ? (
                      <img
                        src={card.creator.profile_photo_url}
                        alt={card.creator.handle}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-white shadow-sm"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex items-center justify-center text-white font-bold shrink-0">
                        {card.creator.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-dh">@{card.creator.handle}</p>
                        {card.creator.is_verified && <BadgeCheck size={13} className="text-blue-500 shrink-0" />}
                      </div>
                      {card.creator.name && card.creator.name !== card.creator.handle && (
                        <p className="text-[11px] text-ds">{card.creator.name}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-dh">{fmt(card.creator.followers)}</p>
                      <p className="text-[10px] text-dm">followers</p>
                    </div>
                  </div>
                  {card.creator.bio && (
                    <p className="px-3.5 py-2 text-[11px] text-ds border-t border-glass leading-relaxed line-clamp-2">
                      {card.creator.bio}
                    </p>
                  )}
                  <div className="px-3.5 py-2.5 flex items-center justify-between border-t border-glass gap-3">
                    <div className="flex gap-1.5 flex-wrap items-center">
                      {card.creator.niche_tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[9px] glass-sub border border-glass text-ds px-1.5 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                      <span className="text-[10px] text-dm">
                        ${fmt(card.creator.est_cost_min)}–${fmt(card.creator.est_cost_max)}/post
                      </span>
                    </div>
                    <button
                      onClick={() => handleAdd(card.handle)}
                      disabled={card.added}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        card.added
                          ? "bg-emerald-50 text-emerald-600 cursor-default"
                          : "bg-gray-900 text-white hover:bg-gray-700"
                      }`}
                    >
                      {card.added ? <><Check size={11} /> Added</> : <>Add</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add all */}
          {successCards.filter(c => !c.added).length > 1 && (
            <button
              onClick={() => successCards.filter(c => !c.added).forEach(c => handleAdd(c.handle))}
              className="w-full py-2 rounded-xl border border-glass text-xs font-semibold text-ds hover:glass-sub transition"
            >
              Add all {successCards.filter(c => !c.added).length} to Pipeline
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DM Outreach Panel ────────────────────────────────────────────────────────
function DMOutreachPanel({ creator, onClose }: { creator: Creator; onClose: () => void }) {
  const [msg, setMsg]         = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);

  async function generate() {
    setLoading(true);
    setCopied(false);
    try {
      const res  = await fetch("/api/creators/dm-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creator }),
      });
      const data = await res.json();
      setMsg(data.message ?? "Could not generate message.");
    } catch {
      setMsg("Could not generate message — check your connection.");
    } finally {
      setLoading(false);
    }
  }

  // Generate on mount
  useEffect(() => { generate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function copyToClipboard() {
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div
      className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-card rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Instagram size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-dh">DM Outreach</p>
              <p className="text-[11px] text-dm">@{creator.handle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={generate} disabled={loading} title="Regenerate message" className="p-1.5 rounded-lg text-dm hover:text-ds hover:glass-sub transition disabled:opacity-40">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={onClose} className="text-dm hover:text-ds transition">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Editable message */}
        {loading ? (
          <div className="rounded-xl border border-glass glass-sub p-3.5 space-y-2.5 h-[220px]">
            {[80, 100, 90, 70, 95].map((w, i) => (
              <div key={i} className="h-3 rounded-full bg-gray-200 animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : (
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            rows={10}
            className="w-full text-sm text-dp rounded-xl border border-glass glass-sub p-3.5 resize-none focus:outline-none focus:border-gray-400 focus:glass-card transition leading-relaxed"
          />
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-40 ${
              copied ? "bg-emerald-50 text-emerald-600" : "glass-sub text-dp hover:bg-gray-200"
            }`}
          >
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Message</>}
          </button>
          <button
            onClick={() => openInstagramDM(creator.handle)}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            <Instagram size={14} /> Open DM →
          </button>
        </div>

        <p className="text-[10px] text-dm text-center">Edit the message above · copy it · then paste in the Instagram DM window</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UGCPage() {
  const router = useRouter();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [showAIDiscover, setShowAIDiscover] = useState(false);
  const [dmCreator, setDmCreator] = useState<Creator | null>(null);
  const [stageFilter, setStageFilter] = useState<PipelineStage | "all">("all");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/creators");
      const data = await res.json();
      setCreators(data.creators ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(fields: Omit<Creator, "id" | "added_at" | "last_updated">) {
    const res = await fetch("/api/creators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (res.ok) { await load(); setShowAdd(false); }
  }

  async function handleDiscoverAdd(c: LookedUpCreator) {
    await fetch("/api/creators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle: c.handle, name: c.name, platform: c.platform,
        followers: c.followers,
        engagement_rate: c.engagement_rate, avg_views: c.avg_views,
        posts_per_week: c.posts_per_week, niche_tags: c.niche_tags,
        brand_fit_score: c.brand_fit_score,
        est_cost_min: c.est_cost_min, est_cost_max: c.est_cost_max,
        pipeline_stage: "Discovered",
      }),
    });
    await load();
  }

  async function handleStageChange(id: string, stage: PipelineStage) {
    const prev = creators.find(c => c.id === id);
    setCreators(cs => cs.map(c => c.id === id ? { ...c, pipeline_stage: stage } : c));
    await fetch(`/api/creators/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pipeline_stage: stage,
        logAction: "Stage changed",
        logNote: `${prev?.pipeline_stage} → ${stage}`,
      }),
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this creator from CRM?")) return;
    await fetch(`/api/creators/${id}`, { method: "DELETE" });
    setCreators(cs => cs.filter(c => c.id !== id));
  }

  // Summary stats
  const stageCounts = STAGES.reduce((acc, s) => ({ ...acc, [s]: creators.filter(c => c.pipeline_stage === s).length }), {} as Record<string, number>);
  const activeDeals = (stageCounts["Deal Sent"] ?? 0) + (stageCounts["Content Live"] ?? 0);

  const displayed = stageFilter === "all" ? creators : creators.filter(c => c.pipeline_stage === stageFilter);

  return (
    <div className="flex flex-col h-screen overflow-hidden glass-sub/50">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="px-8 pt-6 pb-4 shrink-0">
        <div className="flex items-center justify-between gap-4">
          {/* Title + inline stats */}
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-dh tracking-tight">UGC Creators</h1>
            <div className="flex items-center gap-3 text-xs text-dm">
              <span><span className="font-semibold text-dp">{creators.length}</span> total</span>
              <span className="w-px h-3 bg-gray-200" />
              <span><span className="font-semibold text-dp">{(stageCounts["Contacted"] ?? 0) + (stageCounts["Responded"] ?? 0)}</span> contacted</span>
              <span className="w-px h-3 bg-gray-200" />
              <span><span className="font-semibold text-dp">{activeDeals}</span> active deals</span>
              <span className="w-px h-3 bg-gray-200" />
              <span><span className="font-semibold text-dp">{stageCounts["Content Live"] ?? 0}</span> live</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAIDiscover(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-violet-200 bg-violet-50 text-violet-600 text-xs font-semibold hover:bg-violet-100 transition"
            >
              <Sparkles size={13} strokeWidth={1.8} />
              Find with AI
            </button>
            <button
              onClick={() => setShowDiscover(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-glass glass-card text-ds text-xs font-semibold hover:glass-sub transition"
            >
              <Search size={13} strokeWidth={1.8} />
              Look up Handle
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition"
            >
              <Plus size={13} strokeWidth={2} />
              Add Creator
            </button>
          </div>
        </div>

        {/* Stage filter pills */}
        <div className="flex gap-1.5 mt-4 flex-wrap">
          <button
            onClick={() => setStageFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${stageFilter === "all" ? "bg-gray-900 text-white" : "glass-card border border-glass text-ds hover:text-dp"}`}
          >
            All <span className="opacity-60 ml-0.5">{creators.length}</span>
          </button>
          {STAGES.map(s => {
            const count = stageCounts[s] ?? 0;
            const c = STAGE_COLORS[s];
            const active = stageFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${active ? "bg-gray-900 text-white" : "glass-card border border-glass text-ds hover:text-dp"}`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: active ? "#fff" : c.dot }} />
                {s}
                {count > 0 && <span className="opacity-60">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 pb-6 min-h-0">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-14 glass-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : creators.length === 0 ? (
          <div className="glass-card rounded-xl px-6 py-20 text-center">
            <div className="w-12 h-12 rounded-xl glass-sub border border-glass flex items-center justify-center mx-auto mb-4">
              <Users size={20} strokeWidth={1.6} className="text-dm" />
            </div>
            <p className="text-sm font-semibold text-dp mb-1">No creators yet</p>
            <p className="text-xs text-dm mb-4">Add a UGC creator to start tracking your partnership pipeline.</p>
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={() => setShowAIDiscover(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-violet-200 bg-violet-50 text-violet-600 text-xs font-semibold hover:bg-violet-100 transition"
              >
                <Sparkles size={12} /> Find with AI
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition"
              >
                <Plus size={12} /> Add manually
              </button>
            </div>
          </div>
        ) : displayed.length === 0 ? (
          <div className="glass-card rounded-xl px-6 py-10 text-center">
            <p className="text-sm text-dm">No creators in <span className="font-semibold text-dp">{stageFilter}</span></p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {displayed.map(c => (
              <div
                key={c.id}
                className="glass-card rounded-xl p-4 hover:shadow-md hover:border-glass transition-all cursor-pointer"
                onClick={() => router.push(`/dashboard/ugc/${c.id}`)}
              >
                {/* Top row: avatar + name + menu */}
                <div className="flex items-start gap-3">
                  <Avatar creator={c} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-dh truncate">@{c.handle}</p>
                      {c.brand_fit_score > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500 shrink-0">
                          <Star size={9} className="fill-amber-400 text-amber-400" />
                          {c.brand_fit_score}
                        </span>
                      )}
                    </div>
                    {c.name && c.name !== c.handle && (
                      <p className="text-[11px] text-dm truncate">{c.name}</p>
                    )}
                  </div>
                  {/* Stage dropdown */}
                  <div onClick={e => e.stopPropagation()}>
                    <select
                      value={c.pipeline_stage}
                      onChange={e => handleStageChange(c.id, e.target.value as PipelineStage)}
                      className={`text-[10px] font-semibold rounded-lg px-2 py-1 border-0 outline-none cursor-pointer shrink-0 ${STAGE_COLORS[c.pipeline_stage].bg} ${STAGE_COLORS[c.pipeline_stage].text}`}
                    >
                      {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Stats row */}
                <div className="mt-3 flex items-center gap-3 text-[11px] text-ds">
                  <span className="flex items-center gap-1">
                    <Users size={11} className="text-dm" />
                    <span className="font-semibold text-dp">{fmt(c.followers)}</span>
                  </span>
                  {c.engagement_rate > 0 && (
                    <span className="flex items-center gap-1">
                      <TrendingUp size={11} className="text-dm" />
                      {c.engagement_rate}%
                    </span>
                  )}
                  {c.est_cost_min > 0 && (
                    <span className="flex items-center gap-1">
                      <DollarSign size={11} className="text-dm" />
                      {fmt(c.est_cost_min)}–{fmt(c.est_cost_max)}
                    </span>
                  )}
                </div>

                {/* Niche tags */}
                {c.niche_tags.length > 0 && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {c.niche_tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[9px] glass-sub border border-glass text-ds px-1.5 py-0.5 rounded font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div
                  className="mt-3 pt-3 border-t border-glass-soft flex items-center justify-between"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => setDmCreator(c)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-semibold hover:opacity-90 transition"
                  >
                    <Instagram size={10} /> DM
                  </button>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-dm">
                      {daysAgo(c.last_updated) === 0 ? "today" : `${daysAgo(c.last_updated)}d ago`}
                    </p>
                    <button
                      onClick={() => router.push(`/dashboard/ugc/${c.id}`)}
                      className="text-[11px] text-dm hover:text-dp font-medium flex items-center gap-0.5 transition"
                    >
                      See details <ChevronRight size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add new card */}
            <button
              onClick={() => setShowAdd(true)}
              className="glass-card rounded-xl border border-dashed border-glass p-4 flex flex-col items-center justify-center gap-2 text-dm hover:border-gray-400 hover:text-ds transition-all min-h-[140px]"
            >
              <Plus size={20} strokeWidth={1.5} />
              <span className="text-xs font-medium">Add Creator</span>
            </button>
          </div>
        )}
      </div>

      {dmCreator && <DMOutreachPanel creator={dmCreator} onClose={() => setDmCreator(null)} />}
      {showAdd && <AddCreatorModal onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {showDiscover && (
        <DiscoveryPanel
          onClose={() => setShowDiscover(false)}
          onAdd={handleDiscoverAdd}
        />
      )}
      {showAIDiscover && (
        <AIDiscoveryPanel
          onClose={() => setShowAIDiscover(false)}
          onAdd={handleDiscoverAdd}
        />
      )}
    </div>
  );
}
