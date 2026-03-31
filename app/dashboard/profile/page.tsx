"use client";

import { useState, useEffect } from "react";

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-dm uppercase tracking-widest block mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-glass glass-sub px-4 py-2.5 text-sm text-dp placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:glass-card transition"
      />
    </div>
  );
}

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [brand, setBrand] = useState("");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load saved profile from settings API
  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        if (data.profile_name) setName(data.profile_name);
        if (data.profile_email) setEmail(data.profile_email);
        if (data.profile_brand) setBrand(data.profile_brand);
        if (data.profile_role) setRole(data.profile_role);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function handleSave() {
    setSaving(true);
    const pairs = [
      { key: "profile_name", value: name },
      { key: "profile_email", value: email },
      { key: "profile_brand", value: brand },
      { key: "profile_role", value: role },
    ];
    await Promise.all(
      pairs.map(p =>
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
        })
      )
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dh tracking-tight">Profile</h1>
        <p className="text-sm text-dm mt-1">Your account and workspace details</p>
      </div>

      {/* Avatar card */}
      <div className="glass-card rounded-2xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full glass-sub border border-glass flex items-center justify-center shrink-0">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-dh">{name || "Your Name"}</p>
          <p className="text-xs text-dm mt-0.5">{email || "your@email.com"}</p>
          <p className="text-xs text-dm mt-0.5">{brand || "Brand"} · {role || "Role"}</p>
        </div>
      </div>

      {/* Details form */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <p className="text-xs font-semibold text-dm uppercase tracking-widest">Account Details</p>

        {!loaded ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 glass-sub rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full Name" value={name} onChange={setName} placeholder="e.g. Alex Johnson" />
            <Field label="Email" value={email} onChange={setEmail} placeholder="you@yourbrand.com" type="email" />
            <Field label="Brand" value={brand} onChange={setBrand} placeholder="e.g. Burrata House" />
            <Field label="Role" value={role} onChange={setRole} placeholder="e.g. Marketing Lead" />
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !loaded}
            className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition disabled:opacity-40"
          >
            {saved ? "Saved" : saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <p className="text-xs font-semibold text-dm uppercase tracking-widest">Workspace</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-dp">SKYE</p>
            <p className="text-xs text-dm mt-0.5">Intelligence Platform</p>
          </div>
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg glass-sub text-ds uppercase tracking-wide">Free</span>
        </div>
      </div>
    </div>
  );
}
