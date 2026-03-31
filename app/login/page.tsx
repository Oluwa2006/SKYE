"use client";

import { useState } from "react";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-client";
import { Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");
  const supabase = createSupabaseBrowser();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#f0f8ff" }}>
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-gray-900">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="SKYE" width={36} height={36} className="rounded-xl" />
          <span className="text-white text-lg font-bold tracking-tight">SKYE</span>
        </div>
        <div>
          <p className="text-white text-3xl font-bold leading-snug mb-3">
            Marketing intelligence<br />for food brands.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
            Scrape competitors, analyse winning content patterns, and generate on-brand ideas — all in one workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <p className="text-gray-500 text-xs">Pipeline running</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <Image src="/logo.png" alt="SKYE" width={32} height={32} className="rounded-xl" />
            <span className="text-gray-900 text-lg font-bold">SKYE</span>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
                <Mail size={24} className="text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
              <p className="text-sm text-gray-400">
                We sent a magic link to <span className="font-semibold text-gray-700">{email}</span>.
                Click it to sign in — no password needed.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="text-xs text-gray-400 hover:text-gray-600 transition underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
              <p className="text-sm text-gray-400 mb-8">Enter your email to get a sign-in link.</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@brand.com"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-400 transition"
                  />
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send magic link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
