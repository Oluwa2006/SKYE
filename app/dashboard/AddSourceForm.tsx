"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, ChevronRight, ChevronLeft, Check } from "lucide-react";

type Mode = "manual" | "ai";

type Suggestion = {
  name: string;
  url: string;
  niche: string;
  platform: string;
  reason: string;
};

function ModalShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative glass-card/90 backdrop-blur-xl border border-white/80 shadow-xl rounded-3xl w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

function InputField({
  label, name, value, onChange, placeholder, type = "text", required = false,
}: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-dm uppercase tracking-wide mb-1.5 block">
        {label}
      </label>
      <input
        name={name} value={value} onChange={onChange} placeholder={placeholder}
        required={required} type={type}
        className="w-full rounded-2xl border border-glass glass-sub px-4 py-2.5 text-sm text-dp outline-none focus:border-indigo-300 focus:glass-card transition"
      />
    </div>
  );
}

export default function AddSourceForm() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("manual");

  // Manual form state
  const [form, setForm] = useState({ name: "", platform: "website", url: "", niche: "" });
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState("");

  // AI suggest state
  const [description, setDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [addingSelected, setAddingSelected] = useState(false);
  const [noBrandPrompt, setNoBrandPrompt] = useState(false);

  // When AI tab opens, load brand prompt and auto-run
  useEffect(() => {
    if (mode !== "ai" || !open) return;
    if (suggestions.length > 0 || aiLoading) return; // already ran
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        const saved = data.business_description?.trim();
        if (!saved) { setNoBrandPrompt(true); return; }
        setDescription(saved);
        runSuggest(saved);
      });
  }, [mode, open]);

  function handleClose() {
    setOpen(false);
    setMode("manual");
    setForm({ name: "", platform: "website", url: "", niche: "" });
    setManualError("");
    setDescription("");
    setSuggestions([]);
    setSelected(new Set());
    setAiError("");
    setNoBrandPrompt(false);
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setManualLoading(true);
    setManualError("");
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setManualError(data.error || "Failed to add source"); }
      else { handleClose(); window.location.reload(); }
    } catch { setManualError("Something went wrong."); }
    finally { setManualLoading(false); }
  }

  async function runSuggest(desc: string) {
    setAiLoading(true);
    setAiError("");
    setSuggestions([]);
    setSelected(new Set());
    try {
      const res = await fetch("/api/suggest-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: desc }),
      });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error || "Suggestion failed"); }
      else {
        setSuggestions(data.competitors ?? []);
        setSelected(new Set(data.competitors.map((_: any, i: number) => i)));
      }
    } catch { setAiError("Something went wrong."); }
    finally { setAiLoading(false); }
  }

  function toggleSelect(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  async function handleAddSelected() {
    setAddingSelected(true);
    const toAdd = suggestions.filter((_, i) => selected.has(i));
    await Promise.all(
      toAdd.map((s) =>
        fetch("/api/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: s.name, url: s.url, niche: s.niche, platform: s.platform }),
        })
      )
    );
    setAddingSelected(false);
    handleClose();
    window.location.reload();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-glass glass-card text-dp px-4 py-2.5 text-sm font-semibold hover:glass-sub transition shadow-sm"
      >
        + Add Source
      </button>
    );
  }

  return (
    <ModalShell onClose={handleClose}>
      <div className="p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-dh">Add Competitor Source</h3>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full glass-sub hover:bg-gray-200 flex items-center justify-center text-dm transition"
          >
            <X size={12} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-6 p-1 glass-sub rounded-2xl">
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
              mode === "manual" ? "glass-card text-dh shadow-sm" : "text-dm hover:text-ds"
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setMode("ai")}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
              mode === "ai"
                ? "glass-card text-dh shadow-sm"
                : "text-dm hover:text-ds"
            }`}
          >
            <span className="flex items-center justify-center gap-1"><Sparkles size={12} /> Find with AI</span>
          </button>
        </div>

        {/* Manual form */}
        {mode === "manual" && (
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
            <InputField label="Brand Name" name="name" value={form.name} onChange={handleFormChange} placeholder="e.g. Shake Shack" required />
            <InputField label="URL" name="url" value={form.url} onChange={handleFormChange} placeholder="https://example.com/menu" type="url" required />
            <InputField label="Niche" name="niche" value={form.niche} onChange={handleFormChange} placeholder="e.g. fast casual burgers" required />
            <div>
              <label className="text-xs font-semibold text-dm uppercase tracking-wide mb-1.5 block">Platform</label>
              <select
                name="platform" value={form.platform} onChange={handleFormChange}
                className="w-full rounded-2xl border border-glass glass-sub px-4 py-2.5 text-sm text-dp outline-none focus:border-indigo-300 focus:glass-card transition"
              >
                <option value="website">Website</option>
                <option value="instagram">Instagram</option>
                <option value="blog">Blog</option>
                <option value="menu">Menu Page</option>
              </select>
            </div>
            {manualError && <p className="text-sm text-red-500">{manualError}</p>}
            <div className="flex gap-3 mt-1">
              <button type="submit" disabled={manualLoading}
                className="flex-1 rounded-lg bg-blue-600 text-white py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition">
                {manualLoading ? "Adding..." : "Add Source"}
              </button>
              <button type="button" onClick={handleClose}
                className="flex-1 rounded-lg border border-glass glass-card text-ds py-2.5 text-sm font-semibold hover:glass-sub transition">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* AI suggest */}
        {mode === "ai" && (
          <div className="flex flex-col gap-4">
            {noBrandPrompt ? (
              /* No brand prompt saved yet */
              <div className="text-center py-8 space-y-3">
                <p className="text-sm font-semibold text-dp">No Brand Prompt set</p>
                <p className="text-xs text-dm max-w-xs mx-auto leading-relaxed">
                  Go to Brand Prompt in the sidebar and describe your business first. AI will use that to find your competitors.
                </p>
                <a
                  href="/dashboard/brand-prompt"
                  className="inline-block px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition"
                >
                  <span className="flex items-center gap-1">Set Brand Prompt <ChevronRight size={12} /></span>
                </a>
              </div>
            ) : suggestions.length === 0 ? (
              /* Loading state */
              <>
                <div className="text-center py-8">
                  {aiLoading ? (
                    <>
                      <span className="w-7 h-7 rounded-full border-2 border-glass border-t-gray-800 animate-spin inline-block mb-3" />
                      <p className="text-sm text-ds">Finding competitors for your brand...</p>
                      <p className="text-xs text-dm mt-1">Using your saved Brand Prompt</p>
                    </>
                  ) : (
                    /* Error with retry */
                    <>
                      {aiError && <p className="text-sm text-red-500 mb-3">{aiError}</p>}
                      <button
                        onClick={() => runSuggest(description)}
                        className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition"
                      >
                        <span className="flex items-center gap-1"><Sparkles size={12} /> Try again</span>
                      </button>
                    </>
                  )}
                </div>
                <button onClick={handleClose}
                  className="rounded-lg border border-glass glass-card text-ds py-2.5 text-sm font-semibold hover:glass-sub transition">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-dp">
                    {selected.size} of {suggestions.length} selected
                  </p>
                  <button
                    onClick={() => { setSuggestions([]); setSelected(new Set()); }}
                    className="text-xs text-dm hover:text-ds transition flex items-center gap-1"
                  >
                    <ChevronLeft size={11} /> Search again
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => toggleSelect(i)}
                      className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                        selected.has(i)
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-glass glass-sub hover:glass-sub"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-dh">{s.name}</p>
                          <p className="text-xs text-dm mt-0.5 truncate">{s.url}</p>
                          <p className="text-xs text-ds mt-1">{s.reason}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition ${
                          selected.has(i) ? "border-indigo-500 bg-indigo-500" : "border-gray-300"
                        }`}>
                          {selected.has(i) && <Check size={10} className="text-white" strokeWidth={3} />}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {aiError && <p className="text-sm text-red-500">{aiError}</p>}

                <div className="flex gap-3 mt-1">
                  <button
                    onClick={handleAddSelected}
                    disabled={addingSelected || selected.size === 0}
                    className="flex-1 rounded-lg bg-blue-600 text-white py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition"
                  >
                    {addingSelected ? "Adding..." : `Add ${selected.size} Source${selected.size !== 1 ? "s" : ""}`}
                  </button>
                  <button onClick={handleClose}
                    className="flex-1 rounded-lg border border-glass glass-card text-ds py-2.5 text-sm font-semibold hover:glass-sub transition">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
