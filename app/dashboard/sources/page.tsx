import AddSourceForm from "../AddSourceForm";
import DeleteSourceButton from "../DeleteSourceButton";
import ClearPostsButton from "../ClearPostsButton";

const baseUrl = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export default async function SourcesPage() {
  const res = await fetch(`${baseUrl}/api/sources`, { cache: "no-store" });
  const data = res.ok ? await res.json() : {};
  const sources = data.sources ?? [];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#1e1038", fontFamily: "Gilroy" }}>Sources</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(35,25,65,0.45)" }}>{sources.length} tracked sources</p>
        </div>
        <div className="flex items-center gap-2.5">
          <ClearPostsButton />
          <AddSourceForm />
        </div>
      </div>

      {sources.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          {sources.map((source: any) => {
            const scrapeStatus = source.last_scrape_status;
            const statusColor =
              scrapeStatus === "ok" ? "text-emerald-500" :
              scrapeStatus === "blocked" ? "text-amber-500" :
              scrapeStatus === "error" ? "text-red-400" :
              "text-dm";
            const lastScraped = source.last_scraped_at
              ? new Date(source.last_scraped_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : null;
            return (
              <div key={source.id} className="glass-card rounded-xl p-4 flex flex-col gap-2">
                <p className="font-semibold text-dp text-sm">{source.name}</p>
                <p className="text-xs text-dm">{source.niche}</p>
                <div className="flex items-center gap-1.5">
                  {scrapeStatus && (
                    <span className={`text-[10px] font-semibold capitalize ${statusColor} flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${statusColor.replace("text-", "bg-")}`} />{scrapeStatus}
                    </span>
                  )}
                  {lastScraped && (
                    <span className="text-[10px] text-dm">{lastScraped}</span>
                  )}
                </div>
                <div className="pt-1">
                  <DeleteSourceButton id={source.id} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-xl px-6 py-12 text-center">
          <p className="text-dm text-sm">No sources yet — add one above to start scraping.</p>
        </div>
      )}
    </div>
  );
}
