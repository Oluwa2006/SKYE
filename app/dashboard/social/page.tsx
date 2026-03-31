import SocialTracker from "../SocialTracker";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export default async function SocialPage() {
  const res = await fetch(`${baseUrl}/api/social-accounts`, { cache: "no-store" });
  const data = res.ok ? await res.json() : [];
  const accounts = Array.isArray(data) ? data : [];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#1e1038", fontFamily: "Gilroy" }}>Social</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(35,25,65,0.45)" }}>{accounts.length} accounts tracked</p>
      </div>

      <SocialTracker initial={accounts} />
    </div>
  );
}
