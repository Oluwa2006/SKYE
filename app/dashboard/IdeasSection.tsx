"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check, Film,
  LayoutList, Grid3X3, ChevronLeft, ChevronRight,
} from "lucide-react";
import { FaHeart, FaRegHeart, FaRegComment, FaRegBookmark, FaThumbsUp, FaRetweet, FaFacebook } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { RiSendPlaneLine } from "react-icons/ri";
import { IoMusicalNotesOutline, IoShareSocialOutline, IoPaperPlaneOutline, IoEllipsisHorizontal } from "react-icons/io5";
import { SiTiktok, SiInstagram } from "react-icons/si";

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = "draft" | "approved" | "archived";
type Platform = "instagram" | "tiktok" | "facebook" | "twitter";

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok",    label: "TikTok"    },
  { id: "facebook",  label: "Facebook"  },
  { id: "twitter",   label: "X / Twitter" },
];

const PILLARS = ["promo","menu spotlight","behind the scenes","community","limited-time offer","seasonal","engagement challenge","UGC","brand story","value"] as const;
type Pillar = typeof PILLARS[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusStyle(s: Status) {
  if (s === "approved") return "bg-emerald-100 text-emerald-700";
  if (s === "archived") return "glass-sub text-dm";
  return "bg-amber-50 text-amber-500";
}
function statusLabel(s: Status) {
  if (s === "approved") return "Approved";
  if (s === "archived") return "Archived";
  return "Draft";
}
function PriorityBadge({ score }: { score?: number }) {
  if (!score) return null;
  const color = score >= 8 ? "bg-rose-100 text-rose-600" : score >= 5 ? "bg-amber-100 text-amber-600" : "glass-sub text-dm";
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>P{score}</span>;
}

// ─── Video Brief Panel ────────────────────────────────────────────────────────
function VideoBriefPanel({ idea }: { idea: any }) {
  const router = useRouter();

  const brief = [
    idea.angle   ? `Hook: ${idea.angle}`                        : null,
    idea.script  ? `Script: ${idea.script}`                     : idea.caption ? `Scene: ${idea.caption}` : null,
    idea.cta     ? `CTA: ${idea.cta}`                           : null,
    "Format: Vertical 9:16 · 15–30 seconds",
  ].filter(Boolean).join("\n");

  function sendToStudio() {
    router.push(`/dashboard/video?prompt=${encodeURIComponent(brief)}`);
  }

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3.5 space-y-3">
      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Video Brief</p>
      <div className="space-y-1.5">
        {brief.split("\n").map((line, i) => (
          <p key={i} className="text-xs text-indigo-900 leading-snug">{line}</p>
        ))}
      </div>
      <button
        onClick={sendToStudio}
        className="w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
      >
        <Film size={13} /> Send to Studio →
      </button>
    </div>
  );
}

// ─── Phone frame + platform previews (for carousel) ───────────────────────────
function PhoneFrame({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`relative mx-auto w-[210px] h-[420px] rounded-[36px] border-[5px] ${dark ? "border-zinc-800 bg-zinc-900" : "border-glass glass-card"} shadow-2xl overflow-hidden flex-shrink-0`}>
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 ${dark ? "bg-zinc-900" : "glass-card"} rounded-b-xl z-10`} />
      <div className="w-full h-full overflow-hidden">{children}</div>
    </div>
  );
}
// ─── Shared atoms ─────────────────────────────────────────────────────────────
function Avi({ size = 28, ring = false }: { size?: number; ring?: boolean }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {ring && (
        <div className="absolute inset-0 rounded-full p-[2px]"
          style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}>
          <div className="w-full h-full rounded-full glass-card p-[1.5px]">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-400 to-purple-500" />
          </div>
        </div>
      )}
      {!ring && <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-400 to-purple-500" />}
    </div>
  );
}
function ContentImg({ gradient }: { gradient: string }) {
  return <div className={`w-full aspect-square bg-gradient-to-br ${gradient} flex items-center justify-center`}>
    <div className="w-8 h-8 rounded-full glass-card/20" />
  </div>;
}

// ─── Instagram preview ────────────────────────────────────────────────────────
function IgPreview({ idea }: { idea: any }) {
  return (
    <div className="glass-card h-full flex flex-col text-black overflow-hidden font-[-apple-system,BlinkMacSystemFont,sans-serif]">
      {/* Header */}
      <div className="flex items-center px-3 py-2.5 gap-2.5">
        <Avi size={30} ring />
        <div className="flex-1">
          <p className="text-[11px] font-semibold leading-none">yourbrand</p>
          <p className="text-[9px] text-dm mt-0.5">Sponsored · 🌎</p>
        </div>
        <IoEllipsisHorizontal size={14} className="text-dp" />
      </div>
      {/* Image */}
      <ContentImg gradient="from-orange-300 via-rose-300 to-pink-400" />
      {/* Actions */}
      <div className="px-3 pt-2.5 pb-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3.5">
            <FaRegHeart size={20} className="text-dh" />
            <FaRegComment size={19} className="text-dh" />
            <IoPaperPlaneOutline size={20} className="text-dh" />
          </div>
          <FaRegBookmark size={19} className="text-dh" />
        </div>
        <p className="text-[11px] font-semibold mb-1">1,247 likes</p>
        <p className="text-[10px] leading-relaxed line-clamp-2">
          <span className="font-semibold">yourbrand </span>{idea.caption}
        </p>
        <p className="text-[10px] text-[#00376b] mt-0.5">{idea.cta}</p>
        <p className="text-[9px] text-dm mt-1">#food #restaurant #fresh</p>
        <p className="text-[9px] text-dm mt-0.5">2 hours ago</p>
      </div>
      {/* Instagram nav bar */}
      <div className="mt-auto border-t border-glass px-6 py-2 flex justify-between items-center">
        <SiInstagram size={18} className="text-dp" />
        <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-orange-400 to-pink-500" />
        <div className="w-4 h-4 rounded-full border-2 border-gray-800" />
      </div>
    </div>
  );
}

// ─── TikTok preview ────────────────────────────────────────────────────────────
function TtPreview({ idea }: { idea: any }) {
  return (
    <div className="bg-black h-full flex flex-col text-white overflow-hidden relative select-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center pt-3 pb-1">
        <div className="flex gap-5 text-[11px]">
          <span className="text-white/50 font-medium">Following</span>
          <span className="font-bold border-b-2 border-white pb-0.5">For You</span>
        </div>
        <SiTiktok size={16} className="absolute right-3 top-3 text-white" />
      </div>
      {/* Video area */}
      <div className="flex-1 bg-gradient-to-b from-zinc-800 via-zinc-900 to-black" />
      {/* Right sidebar */}
      <div className="absolute right-2 bottom-16 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center">
          <Avi size={34} ring />
          <div className="w-4 h-4 bg-[#fe2c55] rounded-full -mt-2 flex items-center justify-center text-white text-[9px] font-bold">+</div>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <FaHeart size={22} className="text-white" />
          <span className="text-[9px] font-semibold">24.3K</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <FaRegComment size={20} className="text-white" />
          <span className="text-[9px] font-semibold">847</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <FaRetweet size={20} className="text-white" />
          <span className="text-[9px] font-semibold">1.2K</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <IoShareSocialOutline size={20} className="text-white" />
          <span className="text-[9px] font-semibold">Share</span>
        </div>
        {/* Spinning disc */}
        <div className="w-8 h-8 rounded-full border-4 border-zinc-600 bg-zinc-800 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full glass-card/80" />
        </div>
      </div>
      {/* Bottom overlay */}
      <div className="absolute bottom-0 left-0 right-12 p-3 bg-gradient-to-t from-black via-black/60 to-transparent">
        <p className="text-[11px] font-bold">@yourbrand</p>
        <p className="text-[9px] leading-relaxed line-clamp-2 mt-0.5 text-white/90">{idea.caption}</p>
        <p className="text-[9px] text-[#fe2c55] font-semibold mt-0.5">{idea.cta}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <IoMusicalNotesOutline size={9} />
          <p className="text-[8.5px] text-white/70">Original sound · yourbrand</p>
        </div>
      </div>
      {/* Bottom nav */}
      <div className="bg-black border-t border-zinc-800 px-4 py-2 flex justify-around items-center">
        {["Home","Discover","＋","Inbox","Profile"].map(l => (
          <span key={l} className={`text-[9px] ${l === "＋" ? "bg-[#fe2c55] text-white px-2.5 py-0.5 rounded-md font-bold" : "text-white/50"}`}>{l}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Facebook preview ──────────────────────────────────────────────────────────
function FbPreview({ idea }: { idea: any }) {
  return (
    <div className="bg-[#f0f2f5] h-full flex flex-col text-black overflow-y-auto">
      {/* FB top bar */}
      <div className="glass-card px-3 py-2 flex items-center justify-between border-b border-glass sticky top-0">
        <FaFacebook size={22} className="text-[#1877f2]" />
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-ds">🔍</div>
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[9px]">💬</div>
        </div>
      </div>
      {/* Post card */}
      <div className="glass-card mt-2 mx-0">
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-start gap-2 mb-2.5">
            <Avi size={32} />
            <div className="flex-1">
              <p className="text-[11px] font-bold text-dh leading-none">Your Brand</p>
              <p className="text-[9px] text-ds mt-0.5">Just now · 🌎</p>
            </div>
            <IoEllipsisHorizontal size={14} className="text-ds" />
          </div>
          <p className="text-[10px] leading-relaxed text-dp mb-1 line-clamp-3">{idea.caption}</p>
          <p className="text-[10px] text-[#1877f2] font-medium">{idea.cta}</p>
        </div>
        <ContentImg gradient="from-yellow-200 via-orange-300 to-rose-300" />
        {/* Reactions row */}
        <div className="px-3 py-1.5 border-b border-glass flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-0.5">
              <span className="text-[11px]">👍</span><span className="text-[11px]">❤️</span><span className="text-[11px]">😮</span>
            </div>
            <span className="text-[9px] text-ds ml-1">847</span>
          </div>
          <span className="text-[9px] text-ds">124 comments · 38 shares</span>
        </div>
        {/* Action buttons */}
        <div className="px-2 py-1 flex justify-around">
          {[{icon: FaThumbsUp, label:"Like"},{icon: FaRegComment, label:"Comment"},{icon: RiSendPlaneLine, label:"Share"}].map(({icon: Icon, label}) => (
            <button key={label} className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:glass-sub transition">
              <Icon size={13} className="text-ds" />
              <span className="text-[10px] font-semibold text-ds">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── X / Twitter preview ───────────────────────────────────────────────────────
function TwPreview({ idea }: { idea: any }) {
  return (
    <div className="bg-black h-full flex flex-col text-white overflow-hidden">
      {/* X top bar */}
      <div className="flex items-center justify-center py-3 border-b border-zinc-800">
        <FaXTwitter size={18} className="text-white" />
      </div>
      {/* Tweet */}
      <div className="px-3 pt-3 flex gap-2.5 border-b border-zinc-800 pb-3">
        <Avi size={34} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-bold">Your Brand</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#1d9bf0"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91-1.01-1.01-2.52-1.27-3.91-.81-.67-1.31-1.91-2.19-3.34-2.19-1.43 0-2.67.88-3.34 2.19-1.39-.46-2.9-.2-3.91.81-1.01 1.01-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12c0 1.43.88 2.67 2.19 3.34-.46 1.39-.2 2.9.81 3.91 1.01 1.01 2.52 1.27 3.91.81.67 1.31 1.91 2.19 3.34 2.19 1.43 0 2.67-.88 3.34-2.19 1.39.46 2.9.2 3.91-.81 1.01-1.01 1.27-2.52.81-3.91 1.31-.67 2.19-1.91 2.19-3.34z"/><path d="M10.5 15.5l-2.5-2.5 1.06-1.06 1.44 1.44 3.94-3.94 1.06 1.06z" fill="white"/></svg>
            <span className="text-[9px] text-zinc-500">@yourbrand · 2h</span>
          </div>
          <p className="text-[10px] leading-relaxed mt-1.5 text-zinc-100 line-clamp-5">{idea.caption}</p>
          <p className="text-[10px] text-[#1d9bf0] mt-1">{idea.cta}</p>
          {/* Engagement */}
          <div className="flex items-center justify-between mt-3 text-zinc-500 max-w-[160px]">
            <div className="flex items-center gap-1 hover:text-[#1d9bf0] cursor-pointer">
              <FaRegComment size={12} /><span className="text-[9px]">84</span>
            </div>
            <div className="flex items-center gap-1 hover:text-emerald-400 cursor-pointer">
              <FaRetweet size={12} /><span className="text-[9px]">231</span>
            </div>
            <div className="flex items-center gap-1 hover:text-pink-500 cursor-pointer">
              <FaRegHeart size={12} /><span className="text-[9px]">1.2K</span>
            </div>
            <div className="flex items-center gap-1 hover:text-[#1d9bf0] cursor-pointer">
              <FaRegBookmark size={12} />
            </div>
          </div>
        </div>
      </div>
      {/* X bottom nav */}
      <div className="mt-auto border-t border-zinc-800 px-6 py-2.5 flex justify-around items-center">
        {["🏠","🔍","🔔","✉️"].map(i => <span key={i} className="text-sm opacity-70">{i}</span>)}
        <Avi size={22} />
      </div>
    </div>
  );
}

// ─── Idea action buttons ───────────────────────────────────────────────────────
function IdeaActions({ idea, onStatus }: {
  idea: any;
  onStatus: (id: string, s: Status) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {idea.status !== "approved" && (
        <button onClick={() => onStatus(idea.id, "approved")}
          className="flex-1 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition flex items-center justify-center gap-1">
          <Check size={11} /> Approve
        </button>
      )}
      {idea.status !== "archived" && (
        <button onClick={() => onStatus(idea.id, "archived")}
          className="flex-1 py-1.5 rounded-xl glass-sub text-dm text-xs font-semibold hover:bg-gray-200 transition">
          Archive
        </button>
      )}
      {idea.status !== "draft" && (
        <button onClick={() => onStatus(idea.id, "draft")}
          className="flex-1 py-1.5 rounded-xl bg-amber-50 text-amber-600 text-xs font-semibold hover:bg-amber-100 transition">
          Reset
        </button>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function IdeasSection({ ideas: initial }: { ideas: any[] }) {
  const [ideas, setIdeas] = useState(initial);
  const [filter, setFilter] = useState<Status>("draft");
  const [pillarFilter, setPillarFilter] = useState<"all" | Pillar>("all");
  const [viewMode, setViewMode] = useState<"carousel" | "grid">("carousel");
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [platform, setPlatform] = useState<Platform>("instagram");

  async function handleStatus(id: string, status: Status) {
    await fetch(`/api/ideas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setIdeas(p => p.map(i => i.id === id ? { ...i, status } : i));
  }

  const statusFiltered = ideas.filter(i => i.status === filter);
  const filtered = pillarFilter === "all" ? statusFiltered : statusFiltered.filter(i => i.content_pillar === pillarFilter);
  const counts = { draft: ideas.filter(i => i.status === "draft").length, approved: ideas.filter(i => i.status === "approved").length, archived: ideas.filter(i => i.status === "archived").length };
  const activePillars = PILLARS.filter(p => ideas.some(i => i.content_pillar === p));

  const clampedIdx = Math.min(carouselIdx, Math.max(0, filtered.length - 1));
  const currentIdea = filtered[clampedIdx];

  const isDark = platform === "tiktok" || platform === "twitter";

  return (
    <>
      {ideas.length > 0 && (
        <div className="flex flex-col gap-2.5 mb-5">
          {/* Top bar: view toggle + status filters */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* View toggle */}
            <div className="flex gap-1 glass-sub rounded-xl p-1">
              <button onClick={() => setViewMode("carousel")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === "carousel" ? "glass-card text-dp shadow-sm" : "text-dm hover:text-ds"}`}>
                <LayoutList size={13} /> Detail
              </button>
              <button onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${viewMode === "grid" ? "glass-card text-dp shadow-sm" : "text-dm hover:text-ds"}`}>
                <Grid3X3 size={13} /> Grid
              </button>
            </div>
            {/* Status filters */}
            {(["draft", "approved", "archived"] as const).map(f => (
              <button key={f} onClick={() => { setFilter(f); setCarouselIdx(0); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition capitalize ${filter === f ? "bg-gray-900 text-white" : "glass-card/60 border border-white/80 text-dm hover:text-dp"}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
              </button>
            ))}
          </div>
          {/* Pillar filters */}
          {activePillars.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setPillarFilter("all")}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${pillarFilter === "all" ? "bg-indigo-600 text-white" : "glass-card/60 border border-white/80 text-dm hover:text-indigo-500"}`}>
                All pillars
              </button>
              {activePillars.map(p => (
                <button key={p} onClick={() => { setPillarFilter(p); setCarouselIdx(0); }}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition capitalize ${pillarFilter === p ? "bg-indigo-600 text-white" : "glass-card/60 border border-white/80 text-dm hover:text-indigo-500"}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-glass glass-card shadow-sm p-5">
          <p className="text-dm text-sm">{ideas.length === 0 ? "No ideas yet — run the pipeline to generate some." : `No ${filter} ideas.`}</p>
        </div>

      ) : viewMode === "carousel" && currentIdea ? (
        /* ── Carousel view ─────────────────────────────────────────────── */
        <div>
          <div className="flex rounded-2xl overflow-hidden glass-card shadow-lg border border-glass" style={{ minHeight: 540 }}>

            {/* Left — idea detail */}
            <div className="w-[45%] flex flex-col border-r border-glass overflow-y-auto">
              {/* Header */}
              <div className="px-7 pt-7 pb-4 border-b border-glass-soft">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${statusStyle(currentIdea.status)}`}>{statusLabel(currentIdea.status)}</span>
                  <PriorityBadge score={currentIdea.priority_score} />
                  {currentIdea.content_pillar && (
                    <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide capitalize ml-auto">{currentIdea.content_pillar}</span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-dh leading-snug mb-1">{currentIdea.title}</h2>
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">{currentIdea.angle}</p>
              </div>

              {/* Body */}
              <div className="px-7 py-5 flex flex-col gap-4 flex-1">
                <div>
                  <p className="text-[10px] font-semibold text-dm uppercase tracking-wide mb-1.5">Caption</p>
                  <p className="text-sm text-dp leading-relaxed">{currentIdea.caption}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-dm uppercase tracking-wide mb-1">CTA</p>
                  <p className="text-sm font-semibold text-emerald-600">{currentIdea.cta}</p>
                </div>

                {/* Video Brief + Actions */}
                <div className="pt-2 border-t border-glass mt-auto space-y-3">
                  <VideoBriefPanel idea={currentIdea} />
                  <IdeaActions idea={currentIdea} onStatus={handleStatus} />
                </div>
              </div>
            </div>

            {/* Right — platform preview */}
            <div className="w-[55%] flex flex-col">
              {/* Platform tabs */}
              <div className="flex gap-1 px-4 py-3 border-b border-glass glass-sub/50">
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setPlatform(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${platform === p.id ? "bg-gray-900 text-white" : "text-dm hover:text-dp hover:glass-sub"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              {/* Preview */}
              <div className={`flex-1 flex items-center justify-center p-8 ${isDark ? "bg-zinc-950" : "glass-sub"}`}>
                <PhoneFrame dark={isDark}>
                  {platform === "instagram" && <IgPreview idea={currentIdea} />}
                  {platform === "tiktok"    && <TtPreview idea={currentIdea} />}
                  {platform === "facebook"  && <FbPreview idea={currentIdea} />}
                  {platform === "twitter"   && <TwPreview idea={currentIdea} />}
                </PhoneFrame>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4 px-1">
            <button onClick={() => setCarouselIdx(i => Math.max(0, i - 1))} disabled={clampedIdx === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl glass-card border border-glass text-xs font-semibold text-ds hover:text-dp hover:border-gray-300 transition disabled:opacity-30 shadow-sm">
              <ChevronLeft size={14} /> Prev
            </button>

            {/* Dot indicators */}
            <div className="flex items-center gap-1.5">
              {filtered.slice(0, 12).map((_, i) => (
                <button key={i} onClick={() => setCarouselIdx(i)}
                  className={`rounded-full transition-all ${i === clampedIdx ? "w-5 h-1.5 bg-gray-800" : "w-1.5 h-1.5 bg-gray-300 hover:glass-sub0"}`} />
              ))}
              {filtered.length > 12 && <span className="text-xs text-dm ml-1">+{filtered.length - 12}</span>}
            </div>

            <button onClick={() => setCarouselIdx(i => Math.min(filtered.length - 1, i + 1))} disabled={clampedIdx === filtered.length - 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl glass-card border border-glass text-xs font-semibold text-ds hover:text-dp hover:border-gray-300 transition disabled:opacity-30 shadow-sm">
              Next <ChevronRight size={14} />
            </button>
          </div>

          {/* Counter */}
          <p className="text-center text-xs text-dm mt-2">{clampedIdx + 1} of {filtered.length}</p>
        </div>

      ) : (
        /* ── Grid view ─────────────────────────────────────────────────── */
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(idea => (
            <div key={idea.id}
              className={`rounded-xl border border-glass glass-card shadow-sm p-5 flex flex-col gap-2.5 transition-all duration-200 ${idea.status === "archived" ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${statusStyle(idea.status)}`}>{statusLabel(idea.status)}</span>
                <PriorityBadge score={idea.priority_score} />
              </div>
              {idea.content_pillar && <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide capitalize">{idea.content_pillar}</span>}
              <p className="font-semibold text-dh text-sm leading-snug">{idea.title}</p>
              <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide">{idea.angle}</p>
              <p className="text-sm text-ds leading-relaxed line-clamp-3">{idea.caption}</p>
              <p className="text-sm text-emerald-600 font-semibold mt-auto">{idea.cta}</p>
              <div className="pt-2 border-t border-glass mt-1 space-y-2">
                <VideoBriefPanel idea={idea} />
                <IdeaActions idea={idea} onStatus={handleStatus} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
