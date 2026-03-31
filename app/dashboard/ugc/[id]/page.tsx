"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Instagram, Star, CheckCircle2, Circle,
  Plus, X, ChevronRight, ExternalLink, MapPin,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type PipelineStage = "Discovered" | "Contacted" | "Responded" | "Deal Sent" | "Content Live" | "Complete";

interface Creator {
  id: string; handle: string; name?: string; platform: string;
  profile_photo_url?: string;
  location?: string; followers: number; engagement_rate: number;
  avg_views: number; posts_per_week: number; niche_tags: string[];
  brand_fit_score: number; est_cost_min: number; est_cost_max: number;
  pipeline_stage: PipelineStage; agreed_rate?: number;
  deliverables?: string; deal_notes?: string; due_date?: string;
  added_at: string; last_updated: string;
}

interface Activity { id: string; action: string; note?: string; created_at: string; }
interface CreatorPost {
  id: string; post_url?: string; thumbnail_url?: string; caption?: string;
  likes: number; comments: number; views: number; estimated_reach: number;
  posted_at?: string; content_pillar?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGES: PipelineStage[] = ["Discovered", "Contacted", "Responded", "Deal Sent", "Content Live", "Complete"];

const STAGE_COLORS: Record<PipelineStage, { active: string; text: string }> = {
  Discovered:    { active: "#9ca3af", text: "#6b7280" },
  Contacted:     { active: "#3b82f6", text: "#2563eb" },
  Responded:     { active: "#7c3aed", text: "#6d28d9" },
  "Deal Sent":   { active: "#d97706", text: "#b45309" },
  "Content Live":{ active: "#059669", text: "#047857" },
  Complete:      { active: "#0d9488", text: "#0f766e" },
};

const PLATFORM_COLOR: Record<string, string> = {
  instagram: "#e1306c", tiktok: "#010101",
  youtube: "#ff0000", twitter: "#1da1f2", other: "#6b7280",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1)}K`;
  return String(n);
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function openInstagramDM(handle: string) {
  const h = handle.replace(/^@/, "");
  const isMobile = /iPhone|Android/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = `instagram://user?username=${h}`;
    setTimeout(() => window.open(`https://ig.me/m/${h}`, "_blank"), 500);
  } else {
    window.open(`https://ig.me/m/${h}`, "_blank");
  }
}

// ─── Profile Avatar (with unavatar.io fallback) ───────────────────────────────
function ProfileAvatar({ src, fallbackLetter, fallbackColor, size }: {
  src: string; fallbackLetter: string; fallbackColor: string; size: number;
}) {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    return (
      <img
        src={src}
        alt="profile"
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className="rounded-2xl object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-2xl flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: fallbackColor, fontSize: size * 0.35 }}
    >
      {fallbackLetter}
    </div>
  );
}

// ─── Pipeline Stepper ─────────────────────────────────────────────────────────
function PipelineStepper({
  current, onChange,
}: { current: PipelineStage; onChange: (s: PipelineStage) => void }) {
  const idx = STAGES.indexOf(current);
  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {STAGES.map((stage, i) => {
        const done    = i < idx;
        const active  = i === idx;
        const color   = STAGE_COLORS[stage];
        return (
          <div key={stage} className="flex items-center shrink-0">
            <button
              onClick={() => onChange(stage)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors hover:glass-sub group"
            >
              {done ? (
                <CheckCircle2 size={14} style={{ color: color.active }} className="shrink-0" />
              ) : active ? (
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ background: color.active, boxShadow: `0 0 0 3px ${color.active}22` }}
                />
              ) : (
                <Circle size={14} className="text-gray-200 shrink-0" />
              )}
              <span
                className="text-xs font-semibold whitespace-nowrap transition-colors"
                style={{ color: active ? color.text : done ? "#9ca3af" : "#d1d5db" }}
              >
                {stage}
              </span>
            </button>
            {i < STAGES.length - 1 && (
              <ChevronRight size={12} className="text-gray-200 shrink-0 mx-0.5" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Add Post Modal ───────────────────────────────────────────────────────────
function AddPostModal({ creatorId, onClose, onSave }: {
  creatorId: string;
  onClose: () => void;
  onSave: (post: CreatorPost) => void;
}) {
  const [form, setForm] = useState({
    post_url: "", caption: "",
    likes: 0, comments: 0, views: 0,
    content_pillar: "",
  });

  async function submit() {
    const res = await fetch(`/api/creators/${creatorId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      onSave(data.post);
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-card rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-dh">Add Brand Post</p>
          <button onClick={onClose} className="text-dm hover:text-ds"><X size={16} /></button>
        </div>
        {([
          { key: "post_url",       label: "Post URL",        placeholder: "https://instagram.com/p/...", type: "text" },
          { key: "caption",        label: "Caption",         placeholder: "Post caption...",             type: "text" },
          { key: "views",          label: "Views",           placeholder: "14000",                       type: "number" },
          { key: "likes",          label: "Likes",           placeholder: "820",                         type: "number" },
          { key: "comments",       label: "Comments",        placeholder: "45",                          type: "number" },
          { key: "content_pillar", label: "Content Pillar",  placeholder: "Review, UGC, etc.",           type: "text" },
        ] as const).map(({ key, label, placeholder, type }) => (
          <div key={key}>
            <label className="text-[10px] font-semibold text-dm uppercase tracking-widest block mb-1">{label}</label>
            <input
              type={type}
              value={(form as any)[key] || ""}
              onChange={e => setForm(f => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
              placeholder={placeholder}
              className="w-full rounded-lg border border-glass glass-sub px-3 py-2 text-sm text-dp placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:glass-card transition"
            />
          </div>
        ))}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-glass text-sm text-ds hover:glass-sub transition">Cancel</button>
          <button onClick={submit} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition">Add Post</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────
export default function CreatorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [creator, setCreator]   = useState<Creator | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [posts, setPosts]       = useState<CreatorPost[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [showAddPost, setShowAddPost] = useState(false);

  // Deal form state (synced from creator)
  const [agreedRate,   setAgreedRate]   = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [dealNotes,    setDealNotes]    = useState("");
  const [dueDate,      setDueDate]      = useState("");
  const [dealSaved,    setDealSaved]    = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/creators/${id}`);
    if (!res.ok) { router.push("/dashboard/ugc"); return; }
    const data = await res.json();
    setCreator(data.creator);
    setActivity(data.activity ?? []);
    setPosts(data.posts ?? []);
    // Sync deal fields
    setAgreedRate(data.creator.agreed_rate ? String(data.creator.agreed_rate) : "");
    setDeliverables(data.creator.deliverables ?? "");
    setDealNotes(data.creator.deal_notes ?? "");
    setDueDate(data.creator.due_date ?? "");
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function handleStageChange(stage: PipelineStage) {
    if (!creator) return;
    const prev = creator.pipeline_stage;
    setCreator(c => c ? { ...c, pipeline_stage: stage } : c);
    const res = await fetch(`/api/creators/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pipeline_stage: stage,
        logAction: "Stage changed",
        logNote: `${prev} → ${stage}`,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setActivity(prev => [
        { id: Date.now().toString(), action: "Stage changed", note: `${prev} → ${stage}`, created_at: new Date().toISOString() },
        ...prev,
      ]);
    }
  }

  async function saveDeal() {
    setSaving(true);
    await fetch(`/api/creators/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agreed_rate: agreedRate ? Number(agreedRate) : null,
        deliverables: deliverables || null,
        deal_notes: dealNotes || null,
        due_date: dueDate || null,
        logAction: "Deal updated",
        logNote: agreedRate ? `Agreed rate: $${agreedRate}` : undefined,
      }),
    });
    setSaving(false);
    setDealSaved(true);
    setActivity(prev => [
      { id: Date.now().toString(), action: "Deal updated", note: agreedRate ? `Rate: $${agreedRate}` : "Details updated", created_at: new Date().toISOString() },
      ...prev,
    ]);
    setTimeout(() => setDealSaved(false), 2500);
  }

  if (loading) {
    return (
      <div className="p-8 max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-48 glass-sub rounded animate-pulse" />
        <div className="h-40 glass-card rounded-2xl animate-pulse" />
        <div className="h-32 glass-card rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!creator) return null;

  const totalReach = posts.reduce((s, p) => s + p.estimated_reach, 0);
  const bestPost   = posts.reduce<CreatorPost | null>((best, p) => (!best || p.views > best.views) ? p : best, null);
  const avatarColor = PLATFORM_COLOR[creator.platform] ?? "#6b7280";
  const letter      = (creator.name || creator.handle).charAt(0).toUpperCase();
  const cleanHandle = creator.handle.replace(/^@/, "");
  const avatarSrc   = creator.profile_photo_url ?? `https://unavatar.io/instagram/${cleanHandle}`;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <button
        onClick={() => router.push("/dashboard/ugc")}
        className="flex items-center gap-1.5 text-sm text-dm hover:text-dp transition -ml-1"
      >
        <ArrowLeft size={14} /> UGC Creators
      </button>

      {/* ── Profile header ─────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <ProfileAvatar
              src={avatarSrc}
              fallbackLetter={letter}
              fallbackColor={avatarColor}
              size={64}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-dh">@{creator.handle}</h1>
                {creator.brand_fit_score > 0 && (
                  <span className="flex items-center gap-1 text-sm font-bold text-amber-500">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    {creator.brand_fit_score}/10
                  </span>
                )}
              </div>
              {creator.name && <p className="text-sm text-ds mt-0.5">{creator.name}</p>}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {creator.location && (
                  <span className="text-xs text-dm flex items-center gap-0.5"><MapPin size={11} /> {creator.location}</span>
                )}
                {creator.niche_tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-[10px] glass-sub text-ds px-2 py-0.5 rounded border border-glass font-medium capitalize">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => openInstagramDM(creator.handle)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold hover:opacity-90 transition shadow-sm shrink-0"
          >
            <Instagram size={14} />
            Message on Instagram
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-glass">
          {[
            { label: "Followers",    value: fmt(creator.followers)                                   },
            { label: "Engagement",   value: creator.engagement_rate > 0 ? `${creator.engagement_rate}%` : "—" },
            { label: "Avg Views",    value: creator.avg_views > 0 ? fmt(creator.avg_views) : "—"    },
            { label: "Est. Cost",    value: creator.est_cost_min > 0 ? `$${fmt(creator.est_cost_min)}–$${fmt(creator.est_cost_max)}` : "—" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-dm font-medium mb-1 uppercase tracking-wide">{label}</p>
              <p className="text-base font-bold text-dh">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pipeline status ────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-dm uppercase tracking-widest">Pipeline Status</p>
          <span className="text-xs text-dm">
            In <span className="font-semibold text-dp">{creator.pipeline_stage}</span>
          </span>
        </div>
        <PipelineStepper current={creator.pipeline_stage} onChange={handleStageChange} />
      </div>

      {/* ── Deal details ───────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <p className="text-xs font-semibold text-dm uppercase tracking-widest">Deal Details</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-dm uppercase tracking-widest block mb-1.5">Agreed Rate ($)</label>
            <input
              type="number"
              value={agreedRate}
              onChange={e => { setAgreedRate(e.target.value); setDealSaved(false); }}
              placeholder="e.g. 200"
              className="w-full rounded-xl border border-glass glass-sub px-4 py-2.5 text-sm text-dp placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:glass-card transition"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-dm uppercase tracking-widest block mb-1.5">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => { setDueDate(e.target.value); setDealSaved(false); }}
              className="w-full rounded-xl border border-glass glass-sub px-4 py-2.5 text-sm text-dp focus:outline-none focus:border-gray-400 focus:glass-card transition"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] font-semibold text-dm uppercase tracking-widest block mb-1.5">Deliverables</label>
            <input
              value={deliverables}
              onChange={e => { setDeliverables(e.target.value); setDealSaved(false); }}
              placeholder="e.g. 1 Reel + 3 Stories"
              className="w-full rounded-xl border border-glass glass-sub px-4 py-2.5 text-sm text-dp placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:glass-card transition"
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] font-semibold text-dm uppercase tracking-widest block mb-1.5">Notes</label>
            <textarea
              value={dealNotes}
              onChange={e => { setDealNotes(e.target.value); setDealSaved(false); }}
              placeholder="Any notes about this deal, contact info, follow-up reminders..."
              rows={3}
              className="w-full rounded-xl border border-glass glass-sub px-4 py-2.5 text-sm text-dp placeholder-gray-300 resize-none focus:outline-none focus:border-gray-400 focus:glass-card transition"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveDeal}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition disabled:opacity-40"
          >
            {dealSaved ? "Saved" : saving ? "Saving..." : "Save Deal"}
          </button>
        </div>
      </div>

      {/* ── Posts about brand ──────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-dm uppercase tracking-widest">Brand Posts</p>
          <button
            onClick={() => setShowAddPost(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-ds hover:text-dh transition"
          >
            <Plus size={12} /> Add Post
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: "Total Posts",    value: posts.length },
            { label: "Total Reach",    value: totalReach > 0 ? fmt(totalReach) : "0" },
            { label: "Best Post Views",value: bestPost ? fmt(bestPost.views) : "0" },
          ].map(({ label, value }) => (
            <div key={label} className="glass-sub rounded-xl p-3">
              <p className="text-[10px] text-dm font-medium mb-0.5 uppercase tracking-wide">{label}</p>
              <p className="text-lg font-bold text-dh">{value}</p>
            </div>
          ))}
        </div>

        {posts.length > 0 ? (
          <div className="space-y-2">
            {posts.map(post => (
              <div key={post.id} className="flex items-center justify-between py-2.5 border-b border-glass-soft last:border-0">
                <div className="min-w-0 flex-1">
                  {post.caption && (
                    <p className="text-[12px] text-dp font-medium truncate">{post.caption}</p>
                  )}
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-dm">
                    {post.views > 0    && <span>{fmt(post.views)} views</span>}
                    {post.likes > 0    && <span>{fmt(post.likes)} likes</span>}
                    {post.comments > 0 && <span>{fmt(post.comments)} comments</span>}
                    {post.estimated_reach > 0 && <span className="text-emerald-500 font-medium">{fmt(post.estimated_reach)} reach</span>}
                    {post.content_pillar && <span className="glass-sub px-1.5 py-0.5 rounded font-medium capitalize">{post.content_pillar}</span>}
                  </div>
                </div>
                {post.post_url && (
                  <a
                    href={post.post_url} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 ml-3 text-dm hover:text-ds transition"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-dm text-center py-6">
            No brand posts yet — add a post manually or wait for the tracker to pick them up.
          </p>
        )}
      </div>

      {/* ── Activity log ───────────────────────────────────────────────── */}
      {activity.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-semibold text-dm uppercase tracking-widest mb-4">Activity</p>
          <div className="relative">
            <div className="absolute left-[7px] top-0 bottom-0 w-px glass-sub" />
            <div className="space-y-3">
              {activity.map(item => (
                <div key={item.id} className="flex items-start gap-3 relative">
                  <div className="w-3.5 h-3.5 rounded-full bg-gray-200 border-2 border-white shrink-0 mt-0.5 z-10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-dp">{item.action}</p>
                    {item.note && <p className="text-[11px] text-dm mt-0.5">{item.note}</p>}
                    <p className="text-[10px] text-dm mt-0.5">{timeAgo(item.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showAddPost && (
        <AddPostModal
          creatorId={id}
          onClose={() => setShowAddPost(false)}
          onSave={post => setPosts(ps => [post, ...ps])}
        />
      )}
    </div>
  );
}
