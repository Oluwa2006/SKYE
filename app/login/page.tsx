"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-client";
import { Envelope, CircleNotch } from "@phosphor-icons/react";

// ─── Google icon ─────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ─── Apple icon ───────────────────────────────────────────────────────────────
function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

// ─── GitHub icon ──────────────────────────────────────────────────────────────
function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

export default function LoginPage() {
  const [mode,    setMode]    = useState<"signup" | "login">("signup");
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");
  const [fromOnboarding, setFromOnboarding] = useState(false);
  const [companyName, setCompanyName] = useState("");

  const supabase = createSupabaseBrowser();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("onboarding");
      if (raw) {
        const data = JSON.parse(raw);
        setFromOnboarding(true); // eslint-disable-line react-hooks/set-state-in-effect
        setCompanyName(data.companyData?.company_name ?? "");
      }
    } catch { /* ignore */ }
  }, []);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  }

  async function handleOAuth(provider: "google" | "apple" | "github") {
    setOauthLoading(provider);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background:"#f5f6f8" }}>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo-2.png" alt="Agentica" width={24} height={24} className="rounded-md" />
            <span className="text-gray-900 font-bold text-base">Agentica</span>
          </div>
          <Link href="/" className="text-xs font-medium text-gray-500 hover:text-gray-900">← Back to home</Link>
        </div>
      </nav>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-gray-900 mb-1">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-gray-500">
              {fromOnboarding && companyName
                ? `Your analysis for ${companyName} is ready`
                : mode === "signup" ? "Start free — no credit card required" : "Sign in to your dashboard"}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 mb-6">
            {(["signup", "login"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); setSent(false); }}
                className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
                style={{
                  background: mode === m ? "#fff" : "transparent",
                  color:      mode === m ? "#0f172a" : "rgba(15,23,42,0.4)",
                  boxShadow:  mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}>
                {m === "signup" ? "Create account" : "Sign in"}
              </button>
            ))}
          </div>

          {sent ? (
            <div className="text-center bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-4">
              <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-green-50 border border-green-100">
                <Envelope size={22} weight="duotone" style={{ color:"#16a34a" }} />
              </div>
              <div>
                <p className="text-base font-black text-gray-900">Check your email</p>
                <p className="text-xs mt-1 text-gray-500">
                  Magic link sent to <span className="font-semibold text-gray-700">{email}</span>
                </p>
              </div>
              <button onClick={() => { setSent(false); setEmail(""); }}
                className="text-xs text-gray-400 underline">Use a different email</button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">

              {/* Social buttons */}
              <div className="space-y-2">
                <button onClick={() => handleOAuth("google")} disabled={!!oauthLoading}
                  className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold transition-all hover:bg-gray-50 disabled:opacity-50 text-gray-800">
                  {oauthLoading === "google" ? <CircleNotch size={17} className="animate-spin" /> : <GoogleIcon />}
                  Continue with Google
                </button>
                <button onClick={() => handleOAuth("apple")} disabled={!!oauthLoading}
                  className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background:"#000", color:"#fff" }}>
                  {oauthLoading === "apple" ? <CircleNotch size={17} className="animate-spin" /> : <AppleIcon />}
                  Continue with Apple
                </button>
                <button onClick={() => handleOAuth("github")} disabled={!!oauthLoading}
                  className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background:"#24292e", color:"#fff" }}>
                  {oauthLoading === "github" ? <CircleNotch size={17} className="animate-spin" /> : <GitHubIcon />}
                  Continue with GitHub
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[11px] font-medium text-gray-400">or email</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@brand.com" required
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition bg-gray-50 text-gray-900 placeholder:text-gray-400" />
                {error && (
                  <div className="rounded-xl px-3 py-2 bg-red-50 border border-red-100">
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background:"#2563eb", color:"#fff" }}>
                  {loading
                    ? <CircleNotch size={16} className="animate-spin mx-auto" />
                    : mode === "signup" ? "Send magic link →" : "Send sign-in link →"}
                </button>
              </form>

              <p className="text-center text-[11px] text-gray-400">
                No password needed · We&apos;ll email you a secure link
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="text-center pb-6">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} Agentica</p>
      </footer>
    </div>
  );
}
