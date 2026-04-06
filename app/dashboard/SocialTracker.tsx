"use client";

import { useState, useEffect } from "react";
import { TrendUp, TrendDown, ArrowClockwise, X, Plus } from "@phosphor-icons/react";

const AUTO_SYNC_PLATFORMS = ["instagram"];
const STALE_AFTER_MS      = 23 * 60 * 60 * 1000;
const POLL_INTERVAL_MS    = 24 * 60 * 60 * 1000;

const PLATFORMS = ["instagram", "tiktok", "facebook", "youtube", "x"] as const;
type Platform = (typeof PLATFORMS)[number];

const PLATFORM_ACCENT: Record<Platform, { bar: string; badge: string; badgeText: string }> = {
  instagram: { bar: "from-pink-400 to-orange-300",   badge: "bg-pink-50",  badgeText: "text-pink-500"  },
  tiktok:    { bar: "from-gray-800 to-gray-600",      badge: "glass-sub", badgeText: "text-ds"  },
  facebook:  { bar: "from-blue-500 to-blue-300",      badge: "bg-blue-50",  badgeText: "text-blue-500"  },
  youtube:   { bar: "from-red-500 to-red-300",        badge: "bg-red-50",   badgeText: "text-red-500"   },
  x:         { bar: "from-gray-900 to-gray-700",      badge: "glass-sub", badgeText: "text-ds"  },
};

const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram", tiktok: "TikTok",
  facebook: "Facebook", youtube: "YouTube", x: "X",
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function getGrowth(account: any): number | null {
  const snaps = [...(account.social_snapshots ?? [])].sort(
    (a: any, b: any) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );
  if (snaps.length < 2) return null;
  const oldest = snaps[0].followers ?? 0;
  const newest = snaps[snaps.length - 1].followers ?? 0;
  if (oldest === 0) return null;
  return Math.round(((newest - oldest) / oldest) * 100);
}

// ─── Account Card ─────────────────────────────────────────────────────────────
function AccountCard({
  account, onDelete, onSync,
}: {
  account: any;
  onDelete: (id: string) => Promise<void>;
  onSync:   (id: string) => Promise<void>;
}) {
  const [syncing, setSyncing] = useState(false);

  const platform  = account.platform as Platform;
  const accent    = PLATFORM_ACCENT[platform] ?? PLATFORM_ACCENT.x;
  const growth    = getGrowth(account);
  const canSync   = AUTO_SYNC_PLATFORMS.includes(platform);
  const lastUpdated = account.last_updated ? new Date(account.last_updated) : null;
  const isStale   = !lastUpdated || Date.now() - lastUpdated.getTime() > STALE_AFTER_MS;

  const timeLabel = lastUpdated
    ? lastUpdated.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " · " + lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null;

  async function handleSync() {
    setSyncing(true);
    await onSync(account.id);
    setSyncing(false);
  }

  const stat1 = { value: fmt(account.followers ?? 0),    label: "Followers" };
  const stat2 = account.following > 0
    ? { value: fmt(account.following),                    label: "Following" }
    : { value: fmt(account.avg_likes ?? 0),               label: "Avg Likes" };
  const stat3 = account.posts_count > 0
    ? { value: fmt(account.posts_count),                  label: "Posts" }
    : { value: `${account.engagement_rate ?? 0}%`,        label: "Engagement" };

  return (
    <div className={`group p-[2px] rounded-2xl bg-gradient-to-br ${accent.bar} hover:shadow-md transition-shadow`}>
      <div className="glass-card rounded-[14px] overflow-hidden h-full">
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-center gap-3 mb-5">
          {account.profile_image_url ? (
            <img
              src={account.profile_image_url}
              alt={account.name}
              className="w-9 h-9 rounded-xl object-cover shrink-0 ring-1 ring-gray-100"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accent.bar} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
              {PLATFORM_LABEL[platform]?.slice(0, 2).toUpperCase() ?? "??"}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-dh truncate leading-tight">{account.name}</p>
            <p className="text-[11px] text-dm truncate">@{account.handle}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              account.account_type === "own" ? "bg-gray-900 text-white" : "glass-sub text-ds"
            }`}>
              {account.account_type === "own" ? "Mine" : "Competitor"}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-px glass-sub rounded-xl overflow-hidden mb-4">
          {[stat1, stat2, stat3].map(({ value, label }) => (
            <div key={label} className="glass-card px-3 py-2.5 text-center first:rounded-l-xl last:rounded-r-xl">
              <p className="text-base font-bold text-dh leading-tight">{value}</p>
              <p className="text-[10px] text-dm mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Growth pill */}
        {growth !== null && (
          <div className="mb-3">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              growth >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
            }`}>
              {growth >= 0 ? <TrendUp size={10} weight="regular" /> : <TrendDown size={10} weight="regular" />}
              {Math.abs(growth)}% follower growth
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3.5 border-t border-glass-soft">
          <p className="text-[10px] text-dm flex items-center gap-1">
            {canSync && timeLabel && (
              <>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isStale ? "bg-amber-300" : "bg-emerald-400"}`} />
                {isStale ? "Stale · " : ""}{timeLabel}
              </>
            )}
          </p>
          <div className="flex items-center gap-1.5">
            {canSync && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-ds hover:text-dp hover:glass-sub transition disabled:opacity-40"
              >
                <ArrowClockwise size={10} weight="regular" className={syncing ? "animate-spin" : ""} />
                {syncing ? "Syncing…" : "Sync"}
              </button>
            )}
            <button
              onClick={() => onDelete(account.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-dm hover:text-red-500 hover:bg-red-50 transition"
            >
              <X size={10} weight="regular" /> Delete
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── Add Account Modal ────────────────────────────────────────────────────────
function AddAccountModal({ onAdd, onClose }: { onAdd: (data: any) => Promise<void>; onClose: () => void }) {
  const [form, setForm]   = useState({ name: "", platform: "instagram" as Platform, handle: "", account_type: "own" });
  const [saving, setSaving] = useState(false);
  const isInstagram = form.platform === "instagram";

  function set(key: string, val: string) { setForm(p => ({ ...p, [key]: val })); }

  async function handleSubmit() {
    if (!form.name || !form.handle) return;
    setSaving(true);
    await onAdd({ ...form, handle: form.handle.replace(/^@/, "") });
    setSaving(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-card rounded-2xl shadow-xl border border-glass p-6 w-full max-w-sm flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-dh">Add Social Account</h2>
          <p className="text-xs text-dm mt-0.5">Track your brand or a competitor.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-dm uppercase tracking-widest block mb-1">Account Name</label>
            <input
              value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="e.g. Shake Shack"
              className="w-full rounded-xl border border-glass glass-sub px-3 py-2 text-sm text-dp placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:glass-card transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-dm uppercase tracking-widest block mb-1">Platform</label>
              <select
                value={form.platform} onChange={e => set("platform", e.target.value)}
                className="w-full rounded-xl border border-glass glass-sub px-3 py-2 text-sm text-dp focus:outline-none focus:border-gray-400 focus:glass-card transition"
              >
                {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-dm uppercase tracking-widest block mb-1">Type</label>
              <select
                value={form.account_type} onChange={e => set("account_type", e.target.value)}
                className="w-full rounded-xl border border-glass glass-sub px-3 py-2 text-sm text-dp focus:outline-none focus:border-gray-400 focus:glass-card transition"
              >
                <option value="own">My Brand</option>
                <option value="competitor">Competitor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-dm uppercase tracking-widest block mb-1">Handle</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dm text-sm pointer-events-none">@</span>
              <input
                value={form.handle} onChange={e => set("handle", e.target.value.replace(/^@/, ""))}
                placeholder="handle"
                className="w-full rounded-xl border border-glass glass-sub pl-7 pr-3 py-2 text-sm text-dp placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:glass-card transition"
              />
            </div>
          </div>
        </div>

        {isInstagram && form.handle.trim() && (
          <p className="text-[11px] text-dm leading-relaxed">
            Followers, following, and posts will be pulled live from Instagram and refresh automatically every day.
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-glass text-sm text-ds hover:glass-sub transition">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name || !form.handle}
            className="flex-1 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving
              ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> {isInstagram ? "Fetching…" : "Adding…"}</>
              : isInstagram ? "Add & Sync" : "Add Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SocialTracker({ initial }: { initial: any[] }) {
  const [accounts, setAccounts]       = useState(initial);
  const [showAdd, setShowAdd]         = useState(false);
  const [typeFilter, setTypeFilter]   = useState<"all" | "own" | "competitor">("all");
  const [syncingAll, setSyncingAll]   = useState(false);
  const [liveUpdating, setLiveUpdating] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  useEffect(() => {
    const stale = initial.filter(a => {
      if (!AUTO_SYNC_PLATFORMS.includes(a.platform?.toLowerCase())) return false;
      const lu = a.last_updated ? new Date(a.last_updated) : null;
      return !lu || Date.now() - lu.getTime() > STALE_AFTER_MS;
    });

    async function runSync() {
      if (!stale.length) return;
      setLiveUpdating(true);
      await Promise.all(stale.map(a => syncAccount(a.id))).catch(() => {});
      setLiveUpdating(false);
      setLastSyncedAt(new Date());
    }

    runSync();
    const interval = setInterval(runSync, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function syncAccount(id: string) {
    const res  = await fetch("/api/social-accounts/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: id }),
    });
    const data = await res.json();
    const r    = data.results?.[0];
    if (r?.status === "synced") {
      setAccounts(prev => prev.map(a => a.id === id
        ? { ...a, followers: r.followers, following: r.following, posts_count: r.posts_count,
            avg_likes: r.avg_likes, engagement_rate: r.engagement_rate,
            last_updated: new Date().toISOString(),
            ...(r.profile_image_url ? { profile_image_url: r.profile_image_url } : {}) }
        : a));
    }
  }

  async function handleSyncAll() {
    setSyncingAll(true);
    setLiveUpdating(true);
    await Promise.all(accounts.filter(a => AUTO_SYNC_PLATFORMS.includes(a.platform?.toLowerCase())).map(a => syncAccount(a.id)));
    setSyncingAll(false);
    setLiveUpdating(false);
    setLastSyncedAt(new Date());
  }

  async function handleAdd(data: any) {
    const res     = await fetch("/api/social-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const account = await res.json();
    setAccounts(prev => [...prev, { ...account, social_snapshots: account.social_snapshots ?? [] }]);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/social-accounts/${id}`, { method: "DELETE" });
    if (res.ok) setAccounts(prev => prev.filter(a => a.id !== id));
  }

  const filtered       = typeFilter === "all" ? accounts : accounts.filter(a => a.account_type === typeFilter);
  const totalFollowers = accounts.filter(a => a.account_type === "own").reduce((s, a) => s + (a.followers ?? 0), 0);
  const avgEngagement  = accounts.length
    ? (accounts.reduce((s, a) => s + (a.engagement_rate ?? 0), 0) / accounts.length).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">

      {/* ── Summary strip ──────────────────────────────────────────────── */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { value: fmt(totalFollowers),   label: "Total followers" },
            { value: `${avgEngagement}%`,   label: "Avg engagement" },
            { value: String(accounts.filter(a => a.account_type === "own").length),        label: "Your accounts" },
            { value: String(accounts.filter(a => a.account_type === "competitor").length), label: "Competitors" },
          ].map(({ value, label }) => (
            <div key={label} className="glass-card rounded-xl px-5 py-4">
              <p className="text-xl font-bold text-dh leading-none">{value}</p>
              <p className="text-[11px] text-dm mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Live dot */}
          <div className="flex items-center gap-1.5 mr-1">
            <span className={`w-1.5 h-1.5 rounded-full ${liveUpdating ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
            <span className="text-[11px] text-dm">
              {liveUpdating ? "Syncing…" : lastSyncedAt ? `Synced ${lastSyncedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : "Live"}
            </span>
          </div>

          {(["all", "own", "competitor"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                typeFilter === t ? "bg-gray-900 text-white" : "glass-card border border-glass text-ds hover:text-dp"
              }`}
            >
              {t === "all" ? "All" : t === "own" ? "My Brand" : "Competitors"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {accounts.some(a => AUTO_SYNC_PLATFORMS.includes(a.platform?.toLowerCase())) && (
            <button
              onClick={handleSyncAll}
              disabled={syncingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-glass glass-card text-xs font-semibold text-ds hover:text-dp hover:glass-sub transition disabled:opacity-40"
            >
              <ArrowClockwise size={11} weight="regular" className={syncingAll ? "animate-spin" : ""} />
              Sync All
            </button>
          )}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition"
          >
            <Plus size={11} weight="regular" /> Add Account
          </button>
        </div>
      </div>

      {/* ── Cards ──────────────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((account, i) => (
            <AccountCard
              key={account.id ?? i}
              account={account}
              onDelete={handleDelete}
              onSync={syncAccount}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-xl px-6 py-14 text-center">
          <p className="text-sm text-dm mb-4">
            {accounts.length === 0 ? "No accounts tracked yet." : `No ${typeFilter} accounts.`}
          </p>
          {accounts.length === 0 && (
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition"
            >
              <Plus size={12} weight="regular" /> Add your first account
            </button>
          )}
        </div>
      )}

      {showAdd && <AddAccountModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
