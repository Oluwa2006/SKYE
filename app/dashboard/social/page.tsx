import { createSupabaseServer } from "@/lib/supabase-server";
import SocialTracker from "../SocialTracker";

export default async function SocialPage() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("social_accounts")
    .select("*")
    .order("created_at", { ascending: false });

  const accounts = data ?? [];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#1e1038" }}>Social</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(35,25,65,0.45)" }}>{accounts.length} accounts tracked</p>
      </div>

      <SocialTracker initial={accounts} />
    </div>
  );
}
