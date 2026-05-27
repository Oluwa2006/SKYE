import { createSupabaseServer } from "@/lib/supabase-server";
import IdeasSection from "../IdeasSection";
import RunPipelineButton from "../RunPipelineButton";

export default async function IdeasPage() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("ideas")
    .select("*")
    .order("created_at", { ascending: false });

  const ideas    = data ?? [];
  const approved = ideas.filter((i) => i.status === "approved").length;
  const draft    = ideas.filter((i) => i.status === "draft").length;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-end">
        <RunPipelineButton />
      </div>

      <IdeasSection ideas={ideas} />
    </div>
  );
}
