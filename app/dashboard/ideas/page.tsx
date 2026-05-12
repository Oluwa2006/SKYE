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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#1e1038" }}>Ideas</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(35,25,65,0.45)" }}>
            {ideas.length} total · {approved} approved · {draft} draft
          </p>
        </div>
        <RunPipelineButton />
      </div>

      <IdeasSection ideas={ideas} />
    </div>
  );
}
