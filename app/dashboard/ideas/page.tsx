import IdeasSection from "../IdeasSection";
import RunPipelineButton from "../RunPipelineButton";

const baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export default async function IdeasPage() {
  const res = await fetch(`${baseUrl}/api/ideas`, { cache: "no-store" });
  const data = res.ok ? await res.json() : {};
  const ideas = data.ideas ?? [];

  const approved = ideas.filter((i: any) => i.status === "approved").length;
  const draft    = ideas.filter((i: any) => i.status === "draft").length;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#1e1038", fontFamily: "Gilroy" }}>Ideas</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(35,25,65,0.45)" }}>{ideas.length} total · {approved} approved · {draft} draft</p>
        </div>
        <RunPipelineButton />
      </div>

      <IdeasSection ideas={ideas} />
    </div>
  );
}
