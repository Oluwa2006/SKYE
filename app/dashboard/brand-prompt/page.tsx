"use client";

import { useState, useEffect } from "react";
import { PenLine, CheckCircle2 } from "lucide-react";

export default function BrandPromptPage() {
  const [saved, setSaved] = useState("");        // the last saved value
  const [draft, setDraft] = useState("");        // current edit value
  const [editing, setEditing] = useState(false); // view vs edit mode
  const [loading, setLoading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        const v = data.business_description ?? "";
        setSaved(v);
        setDraft(v);
        // If no prompt yet, drop straight into edit mode
        if (!v.trim()) setEditing(true);
      })
      .finally(() => setFetching(false));
  }, []);

  async function handleSave() {
    setLoading(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "business_description", value: draft }),
    });
    setLoading(false);
    setSaved(draft);
    setEditing(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  }

  function handleEdit() {
    setDraft(saved);
    setEditing(true);
    setJustSaved(false);
  }

  function handleCancel() {
    setDraft(saved);
    setEditing(false);
  }

  const hasSaved = saved.trim().length > 0;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dh tracking-tight">Brand Prompt</h1>
          <p className="text-sm text-dm mt-1">
            This context shapes every idea, caption, and voiceover SKYE generates.
          </p>
        </div>

        {/* Edit button — only shown in view mode when there's a saved prompt */}
        {hasSaved && !editing && !fetching && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-glass text-sm font-semibold text-ds hover:glass-sub transition"
          >
            <PenLine size={13} strokeWidth={1.8} />
            Edit
          </button>
        )}
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-dm uppercase tracking-widest">Your business context</p>
          {justSaved && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
              <CheckCircle2 size={13} />
              Saved
            </span>
          )}
        </div>

        {fetching ? (
          <div className="h-48 glass-sub rounded-xl animate-pulse" />

        ) : editing ? (
          /* ── Edit mode ── */
          <>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={10}
              autoFocus
              placeholder="e.g. We're a fast-casual street food brand in Hyderabad. Our audience is Gen-Z foodies aged 18–28 who love bold flavours and discovering hidden gems. Our tone is energetic, local, and authentic. We compete with Wow Momo and local cloud kitchens but stand out through our unique fusion menu and strong social presence."
              className="w-full rounded-xl border border-glass glass-sub p-4 text-sm text-dp placeholder-gray-300 resize-none focus:outline-none focus:border-gray-400 focus:glass-card transition leading-relaxed"
            />
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-dm">
                {draft.length > 0 ? `${draft.length} characters` : "No prompt set"}
              </p>
              <div className="flex items-center gap-2">
                {hasSaved && (
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-lg border border-glass text-sm text-ds hover:glass-sub transition"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={loading || !draft.trim()}
                  className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition disabled:opacity-40"
                >
                  {loading ? "Saving..." : "Save Prompt"}
                </button>
              </div>
            </div>
          </>

        ) : (
          /* ── View mode ── */
          <div
            className="rounded-xl glass-sub border border-glass p-4 text-sm text-dp leading-relaxed whitespace-pre-wrap cursor-pointer hover:glass-sub transition group"
            onClick={handleEdit}
            title="Click to edit"
          >
            {saved}
            <p className="text-[10px] text-dm mt-3 group-hover:text-dm transition">
              Click to edit
            </p>
          </div>
        )}
      </div>

      {/* Tips — only show when no saved prompt yet */}
      {!hasSaved && (
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs font-semibold text-dm uppercase tracking-widest mb-3">What to include</p>
          <ul className="space-y-2">
            {[
              "Your restaurant type, cuisine, and location",
              "Target audience — age, lifestyle, values",
              "Brand tone — energetic, premium, local, playful...",
              "Key competitors you want to outperform",
              "What makes you different from everyone else",
            ].map(tip => (
              <li key={tip} className="flex items-start gap-2.5">
                <div className="w-1 h-1 rounded-full bg-gray-300 mt-2 shrink-0" />
                <p className="text-sm text-ds">{tip}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
