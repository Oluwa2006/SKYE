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
      <SocialTracker initial={accounts} />
    </div>
  );
}
