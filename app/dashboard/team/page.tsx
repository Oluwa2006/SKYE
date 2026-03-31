"use client";

import { useState, useEffect } from "react";
import {
  UserPlus, X, Crown, Shield, User2, Clock,
  Mail, Check, ChevronDown, Trash2,
} from "lucide-react";
import { useUser } from "../UserContext";

type Role = "owner" | "admin" | "member";
type Status = "active" | "pending";

interface Member {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  status: Status;
  invited_at: string;
  joined_at?: string;
}

function RoleIcon({ role }: { role: Role }) {
  if (role === "owner") return <Crown size={12} className="text-amber-500" />;
  if (role === "admin") return <Shield size={12} className="text-blue-500" />;
  return <User2 size={12} className="text-dm" />;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = [
    "from-violet-400 to-purple-500",
    "from-blue-400 to-indigo-500",
    "from-emerald-400 to-teal-500",
    "from-orange-400 to-red-400",
    "from-pink-400 to-rose-500",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className={`rounded-xl bg-gradient-to-br ${color} text-white flex items-center justify-center shrink-0 text-xs font-bold`}
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

function InviteModal({ onClose, onInvite }: { onClose: () => void; onInvite: (email: string, role: Role) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onInvite(email.trim().toLowerCase(), role);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to invite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative glass-card rounded-2xl shadow-xl p-7 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-dh">Invite teammate</h3>
            <p className="text-xs text-dm mt-0.5">They'll be added to your workspace</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full glass-sub hover:bg-gray-200 flex items-center justify-center text-dm transition"
          >
            <X size={13} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-dm uppercase tracking-wide mb-1.5 block">
              Email Address
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dm" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="teammate@brand.com"
                required
                className="w-full rounded-xl border border-glass glass-sub pl-9 pr-4 py-2.5 text-sm text-dp outline-none focus:border-gray-400 focus:glass-card transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-dm uppercase tracking-wide mb-1.5 block">
              Role
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={e => setRole(e.target.value as Role)}
                className="w-full appearance-none rounded-xl border border-glass glass-sub px-4 py-2.5 text-sm text-dp outline-none focus:border-gray-400 focus:glass-card transition cursor-pointer pr-8"
              >
                <option value="member">Member — can view and edit content</option>
                <option value="admin">Admin — can manage sources and settings</option>
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dm" />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 mt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition disabled:opacity-50"
            >
              {loading ? "Inviting..." : "Send Invite"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-glass text-ds text-sm font-semibold hover:glass-sub transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const currentUser = useUser();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    fetch("/api/team")
      .then(r => r.json())
      .then(d => setMembers(d.members ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleInvite(email: string, role: Role) {
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to invite");
    setMembers(prev => [...prev, data.member]);
  }

  async function handleRemove(id: string) {
    await fetch("/api/team", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMembers(prev => prev.filter(m => m.id !== id));
  }

  const active  = members.filter(m => m.status === "active");
  const pending = members.filter(m => m.status === "pending");

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dh tracking-tight">Team</h1>
          <p className="text-sm text-dm mt-1">
            {members.length} member{members.length !== 1 ? "s" : ""} in your workspace
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition"
        >
          <UserPlus size={14} />
          Invite
        </button>
      </div>

      {/* Active members */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-glass-soft">
          <p className="text-[11px] font-semibold text-dm uppercase tracking-widest">
            Members · {active.length}
          </p>
        </div>

        {loading ? (
          <div className="px-6 py-8 space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-10 glass-sub rounded-xl animate-pulse" />
            ))}
          </div>
        ) : active.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-dm">No active members yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-glass">
            {active.map(member => {
              const isYou = member.email === currentUser?.email;
              return (
                <div key={member.id} className="flex items-center gap-4 px-6 py-4">
                  <Avatar name={member.display_name || member.email} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-dh">
                        {member.display_name || member.email.split("@")[0]}
                        {isYou && (
                          <span className="ml-1.5 text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">you</span>
                        )}
                      </p>
                      <span className="flex items-center gap-0.5">
                        <RoleIcon role={member.role} />
                        <span className="text-[10px] text-dm capitalize">{member.role}</span>
                      </span>
                    </div>
                    <p className="text-xs text-dm truncate">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                      <Check size={9} strokeWidth={3} /> Active
                    </span>
                    {!isYou && (
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="p-1.5 rounded-lg text-dm hover:text-red-400 hover:bg-red-50 transition"
                        title="Remove member"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {pending.length > 0 && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-glass-soft">
            <p className="text-[11px] font-semibold text-dm uppercase tracking-widest">
              Pending Invites · {pending.length}
            </p>
          </div>
          <div className="divide-y divide-glass">
            {pending.map(member => (
              <div key={member.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-9 h-9 rounded-xl glass-sub flex items-center justify-center shrink-0">
                  <Mail size={14} className="text-dm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dp">{member.email}</p>
                  <p className="text-xs text-dm capitalize">{member.role} · Invite sent</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-semibold">
                    <Clock size={9} /> Pending
                  </span>
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="p-1.5 rounded-lg text-dm hover:text-red-400 hover:bg-red-50 transition"
                    title="Cancel invite"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info card */}
      <div className="glass-card rounded-2xl p-5">
        <p className="text-[11px] font-semibold text-dm uppercase tracking-widest mb-3">How invites work</p>
        <ul className="space-y-2">
          {[
            "Enter your teammate's email and choose their role",
            "They sign up at your workspace URL using that email",
            "Once signed in, they'll appear as Active automatically",
          ].map(tip => (
            <li key={tip} className="flex items-start gap-2.5">
              <div className="w-1 h-1 rounded-full bg-gray-300 mt-2 shrink-0" />
              <p className="text-sm text-ds">{tip}</p>
            </li>
          ))}
        </ul>
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvite={handleInvite}
        />
      )}
    </div>
  );
}
