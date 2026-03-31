"use client";

import { useState } from "react";

export default function DeleteSourceButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Remove this source?")) return;
    setLoading(true);
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
    window.location.reload();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-400 hover:text-red-600 font-medium transition disabled:opacity-40 mt-1"
    >
      {loading ? "Removing..." : "Remove"}
    </button>
  );
}
