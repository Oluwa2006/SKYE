"use client";

import { useState } from "react";

export default function ClearPostsButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleClear() {
    if (!confirm("Delete all posts and their analyses? This cannot be undone.")) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/posts/delete", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Failed to clear posts");
      } else {
        setMessage("Cleared. Refresh to update.");
      }
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClear}
        disabled={loading}
        className="rounded-lg border border-red-200 bg-white text-red-500 px-4 py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-red-50 transition shadow-sm"
      >
        {loading ? "Clearing..." : "Clear Posts"}
      </button>
      {message && <p className="text-xs text-gray-400 mt-2">{message}</p>}
    </div>
  );
}
