"use client";

import { useState, useEffect } from "react";
import {
  X, Heart, MessageCircle, Share2, Bookmark, Music, Globe,
  ThumbsUp, BarChart2, Mail, ChevronDown, Mic, Check, RefreshCw,
} from "lucide-react";
import { LANGUAGES, DEFAULT_LANGUAGE_CODE, getVoicesForLanguage } from "@/lib/elevenlabs";

type Platform = "instagram" | "tiktok" | "facebook" | "twitter" | "linkedin";
type Status = "draft" | "approved" | "archived";

const PLATFORMS: { id: Platform; label: string; color: string }[] = [
  { id: "instagram", label: "Instagram", color: "from-purple-500 via-pink-500 to-orange-400" },
  { id: "tiktok", label: "TikTok", color: "from-black to-zinc-800" },
  { id: "facebook", label: "Facebook", color: "from-blue-600 to-blue-500" },
  { id: "twitter", label: "Twitter / X", color: "from-zinc-900 to-zinc-800" },
  { id: "linkedin", label: "LinkedIn", color: "from-blue-700 to-blue-600" },
];

function Avatar() {
  return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex-shrink-0" />;
}

function FoodImagePlaceholder({ gradient }: { gradient: string }) {
  return (
    <div className={`w-full aspect-square bg-gradient-to-br ${gradient} flex items-center justify-center`}>
      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm" />
    </div>
  );
}

function InstagramPreview({ idea }: { idea: any }) {
  return (
    <div className="bg-white h-full flex flex-col text-black overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Avatar />
          <div>
            <p className="text-xs font-semibold leading-none">yourbrand</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Sponsored</p>
          </div>
        </div>
        <span className="text-gray-400 text-lg leading-none">···</span>
      </div>
      <FoodImagePlaceholder gradient="from-orange-300 via-red-300 to-pink-300" />
      <div className="px-3 pt-2.5 pb-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-3.5 items-center">
            <Heart size={18} strokeWidth={1.5} className="text-gray-700" />
            <MessageCircle size={18} strokeWidth={1.5} className="text-gray-700" />
            <Share2 size={18} strokeWidth={1.5} className="text-gray-700" />
          </div>
          <Bookmark size={18} strokeWidth={1.5} className="text-gray-700" />
        </div>
        <p className="text-xs font-semibold mb-1">1,247 likes</p>
        <p className="text-xs leading-relaxed">
          <span className="font-semibold">yourbrand </span>
          {idea.caption}
        </p>
        <p className="text-xs text-blue-500 mt-1">{idea.cta}</p>
        <p className="text-xs text-gray-400 mt-1">#food #restaurant #fresh</p>
      </div>
    </div>
  );
}

function TikTokPreview({ idea }: { idea: any }) {
  return (
    <div className="bg-black h-full flex flex-col text-white overflow-hidden relative">
      <div className="flex-1 bg-gradient-to-b from-zinc-800 via-zinc-900 to-black flex items-center justify-center relative">
        <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm" />
        <div className="absolute right-2 bottom-16 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white" />
            <div className="w-4 h-4 bg-red-500 rounded-full -mt-2 flex items-center justify-center">
              <span className="text-white text-[8px]">+</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5"><Heart size={18} strokeWidth={1.5} /><span className="text-[9px]">24.3K</span></div>
          <div className="flex flex-col items-center gap-0.5"><MessageCircle size={18} strokeWidth={1.5} /><span className="text-[9px]">847</span></div>
          <div className="flex flex-col items-center gap-0.5"><Share2 size={18} strokeWidth={1.5} /><span className="text-[9px]">Share</span></div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
            <Music size={12} />
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-12 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-xs font-bold mb-1">@yourbrand</p>
        <p className="text-xs leading-relaxed line-clamp-2">{idea.caption}</p>
        <p className="text-xs text-pink-400 mt-1 font-semibold">{idea.cta}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <Music size={10} />
          <p className="text-[10px] text-gray-300">Original sound · yourbrand</p>
        </div>
      </div>
    </div>
  );
}

function FacebookPreview({ idea }: { idea: any }) {
  return (
    <div className="bg-white h-full flex flex-col text-black overflow-y-auto">
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2.5">
          <Avatar />
          <div className="flex-1">
            <p className="text-xs font-semibold leading-none">Your Brand</p>
            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">Just now · <Globe size={10} /></p>
          </div>
          <span className="text-gray-400 text-sm">···</span>
        </div>
        <p className="text-xs leading-relaxed mb-2.5">{idea.caption}</p>
        <p className="text-xs text-blue-600 font-medium mb-2.5">{idea.cta}</p>
      </div>
      <FoodImagePlaceholder gradient="from-yellow-300 via-orange-300 to-red-300" />
      <div className="px-3 py-2 border-t border-gray-100">
        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-2">
          <span className="flex items-center gap-1"><ThumbsUp size={10} /><Heart size={10} /> 847</span><span>124 comments</span>
        </div>
        <div className="flex items-center justify-around border-t border-gray-100 pt-2">
          <button className="flex items-center gap-1 text-[11px] text-gray-500 font-medium"><ThumbsUp size={12} /> Like</button>
          <button className="flex items-center gap-1 text-[11px] text-gray-500 font-medium"><MessageCircle size={12} /> Comment</button>
          <button className="flex items-center gap-1 text-[11px] text-gray-500 font-medium"><Share2 size={12} /> Share</button>
        </div>
      </div>
    </div>
  );
}

function TwitterPreview({ idea }: { idea: any }) {
  const tweetText = idea.caption?.slice(0, 240) + (idea.caption?.length > 240 ? "…" : "");
  return (
    <div className="bg-black h-full flex flex-col text-white overflow-hidden">
      <div className="p-3 border-b border-zinc-800">
        <div className="flex gap-2">
          <Avatar />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs font-bold">Your Brand</span>
              <Check size={11} className="text-blue-400" />
              <span className="text-gray-500 text-xs">@yourbrand · now</span>
            </div>
            <p className="text-xs leading-relaxed mt-1.5">{tweetText}</p>
            <p className="text-xs text-blue-400 mt-1">{idea.cta}</p>
            <div className="mt-2 rounded-xl overflow-hidden">
              <div className="w-full h-28 bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/10" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2.5 text-gray-500">
              <span className="text-xs flex items-center gap-0.5"><MessageCircle size={11} /> 84</span>
              <span className="text-xs flex items-center gap-0.5"><RefreshCw size={11} /> 231</span>
              <span className="text-xs flex items-center gap-0.5"><Heart size={11} /> 1.2K</span>
              <span className="text-xs flex items-center gap-0.5"><BarChart2 size={11} /> 14K</span>
              <span className="text-xs flex items-center gap-0.5"><Share2 size={11} /></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkedInPreview({ idea }: { idea: any }) {
  return (
    <div className="bg-[#f3f2ef] h-full flex flex-col text-black overflow-y-auto">
      <div className="bg-white m-2 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3">
          <div className="flex items-start gap-2 mb-2.5">
            <Avatar />
            <div className="flex-1">
              <p className="text-xs font-semibold leading-none">Your Brand</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Food & Beverage · Just now</p>
              <p className="text-[10px] text-gray-400 flex items-center gap-1"><Globe size={10} /> Everyone</p>
            </div>
            <span className="text-blue-600 text-xs font-semibold">+ Follow</span>
          </div>
          <p className="text-xs leading-relaxed">{idea.caption}</p>
          <p className="text-xs text-blue-600 font-medium mt-1.5">{idea.cta}</p>
          <p className="text-xs text-blue-500 mt-1">#food #restaurant #marketing</p>
        </div>
        <FoodImagePlaceholder gradient="from-blue-200 via-indigo-200 to-purple-200" />
        <div className="p-3">
          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-2 pb-2 border-b border-gray-100">
            <span className="flex items-center gap-1"><ThumbsUp size={10} /><Heart size={10} /> 312 reactions</span><span>47 comments</span>
          </div>
          <div className="flex items-center justify-around">
            <button className="flex items-center gap-1 text-[11px] text-gray-500 font-medium"><ThumbsUp size={12} /> Like</button>
            <button className="flex items-center gap-1 text-[11px] text-gray-500 font-medium"><MessageCircle size={12} /> Comment</button>
            <button className="flex items-center gap-1 text-[11px] text-gray-500 font-medium"><Share2 size={12} /> Share</button>
            <button className="flex items-center gap-1 text-[11px] text-gray-500 font-medium"><Mail size={12} /> Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneFrame({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`relative mx-auto w-[260px] h-[520px] rounded-[40px] border-[6px] ${dark ? "border-zinc-800 bg-zinc-900" : "border-gray-200 bg-white"} shadow-2xl overflow-hidden`}>
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 ${dark ? "bg-zinc-900" : "bg-white"} rounded-b-2xl z-10`} />
      <div className="w-full h-full overflow-hidden">{children}</div>
    </div>
  );
}

export default function IdeaModal({
  idea,
  onClose,
  onStatusChange,
  onGenerateVoice,
  voiceLoading,
}: {
  idea: any;
  onClose: () => void;
  onStatusChange?: (id: string, status: Status) => void;
  onGenerateVoice?: (id: string, voiceId?: string, languageCode?: string) => void;
  voiceLoading?: Set<string>;
}) {
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGE_CODE);
  const availableVoices = getVoicesForLanguage(selectedLanguage);
  const [selectedVoice, setSelectedVoice] = useState(idea.voice_id || availableVoices[0].id);

  function handleLanguageChange(code: string) {
    setSelectedLanguage(code);
    const voices = getVoicesForLanguage(code);
    setSelectedVoice(voices[0].id);
  }

  const isGenerating = voiceLoading?.has(idea.id) || idea.audio_status === "generating";
  const isDark = platform === "tiktok" || platform === "twitter";

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(8px)", background: "rgba(240,248,255,0.7)" }}
    >
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative w-full max-w-3xl rounded-2xl border border-gray-100 bg-white shadow-2xl overflow-hidden"
        style={{ animation: "zoomIn 0.2s ease-out" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-semibold transition"
        >
          <X size={14} />
        </button>

        <div className="flex flex-col md:flex-row min-h-[580px]">
          {/* Left — idea details + voice */}
          <div className="md:w-5/12 p-7 flex flex-col gap-3 border-b md:border-b-0 md:border-r border-gray-100 overflow-y-auto">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Content Idea</p>
            <h2 className="text-xl font-bold text-gray-900 leading-snug">{idea.title}</h2>
            <span className="inline-block text-xs font-semibold text-indigo-500 uppercase tracking-wide">
              {idea.angle}
            </span>

            <div className="space-y-3 mt-1">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Caption</p>
                <p className="text-sm text-gray-700 leading-relaxed">{idea.caption}</p>
              </div>
              {idea.script && (
                <div className="rounded-2xl bg-violet-50 border border-violet-100 px-3.5 py-3">
                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Mic size={10} /> Voiceover Script</p>
                  <p className="text-sm text-violet-900 leading-relaxed">{idea.script}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">CTA</p>
                <p className="text-sm font-semibold text-emerald-600">{idea.cta}</p>
              </div>
            </div>

            {/* Voice section */}
            <div className="pt-3 border-t border-gray-100 mt-1 space-y-2.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Mic size={10} /> Voiceover</p>

              {/* Language picker — first so voice list updates */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Language</p>
                <div className="flex gap-1.5 flex-wrap">
                  {LANGUAGES.slice(0, 6).map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                        selectedLanguage === lang.code
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : "border-gray-100 bg-gray-50 text-gray-400 hover:text-gray-700"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                  <div className="relative flex-1 min-w-[80px]">
                    <select
                      value={LANGUAGES.slice(6).some(l => l.code === selectedLanguage) ? selectedLanguage : ""}
                      onChange={(e) => e.target.value && handleLanguageChange(e.target.value)}
                      className="w-full appearance-none px-2.5 py-1 rounded-lg border border-gray-100 bg-gray-50 text-[11px] font-semibold text-gray-400 focus:outline-none focus:border-indigo-300 transition cursor-pointer pr-6"
                    >
                      <option value="">More...</option>
                      {LANGUAGES.slice(6).map((lang) => (
                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={10} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Voice picker — filtered by selected language */}
              <div className="grid grid-cols-1 gap-1.5">
                {availableVoices.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition border ${
                      selectedVoice === v.id
                        ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                        : "border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <span>{v.name}</span>
                    <span className="text-[10px] opacity-60">{v.description}</span>
                  </button>
                ))}
              </div>

              {/* Generate button */}
              {onGenerateVoice && (
                <button
                  onClick={() => onGenerateVoice(idea.id, selectedVoice, selectedLanguage)}
                  disabled={isGenerating}
                  className="w-full py-2.5 rounded-2xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Generating voice...
                    </>
                  ) : idea.audio_status === "ready" ? (
                    <><Mic size={13} /> Regenerate Voice</>
                  ) : (
                    <><Mic size={13} /> Generate Voice</>
                  )}
                </button>
              )}

              {/* Audio player */}
              {idea.audio_url && idea.audio_status === "ready" && (
                <div>
                  <audio
                    controls
                    src={idea.audio_url}
                    className="w-full h-9 mt-1"
                    style={{ accentColor: "#7c3aed" }}
                  />
                </div>
              )}
              {idea.audio_status === "error" && (
                <p className="text-xs text-red-400">Generation failed. Try again.</p>
              )}
            </div>

            {/* Status actions */}
            {onStatusChange && (
              <div className="flex gap-2 pt-3 border-t border-gray-100 mt-1">
                {idea.status !== "approved" && (
                  <button onClick={() => onStatusChange(idea.id, "approved")}
                    className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition flex items-center justify-center gap-1">
                    <Check size={11} /> Approve
                  </button>
                )}
                {idea.status !== "archived" && (
                  <button onClick={() => onStatusChange(idea.id, "archived")}
                    className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-400 text-xs font-semibold hover:bg-gray-200 transition">
                    Archive
                  </button>
                )}
                {idea.status !== "draft" && (
                  <button onClick={() => onStatusChange(idea.id, "draft")}
                    className="flex-1 py-2 rounded-xl bg-amber-50 text-amber-600 text-xs font-semibold hover:bg-amber-100 transition">
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right — platform preview */}
          <div className="md:w-7/12 flex flex-col">
            <div className="flex overflow-x-auto gap-1 p-3 border-b border-gray-100">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                    platform === p.id
                      ? `bg-gradient-to-r ${p.color} text-white shadow-sm`
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className={`flex-1 flex items-center justify-center p-6 ${isDark ? "bg-zinc-950" : "bg-gray-50"}`}>
              <PhoneFrame dark={isDark}>
                {platform === "instagram" && <InstagramPreview idea={idea} />}
                {platform === "tiktok" && <TikTokPreview idea={idea} />}
                {platform === "facebook" && <FacebookPreview idea={idea} />}
                {platform === "twitter" && <TwitterPreview idea={idea} />}
                {platform === "linkedin" && <LinkedInPreview idea={idea} />}
              </PhoneFrame>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
