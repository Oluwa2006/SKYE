import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export async function GET() {
  // ── Overlap prevention (best-effort — skip if table missing) ───────────────
  try {
    const { data: activeRun } = await supabase
      .from("pipeline_runs")
      .select("id, started_at")
      .eq("status", "running")
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (activeRun) {
      return NextResponse.json(
        { error: "Pipeline already running", runId: activeRun.id },
        { status: 409 }
      );
    }
  } catch {
    // table may not exist yet — proceed anyway
  }

  // ── Create run log (best-effort) ───────────────────────────────────────────
  let runId: string | null = null;

  async function updateRun(patch: Record<string, unknown>) {
    if (!runId) return;
    try {
      await supabase.from("pipeline_runs").update(patch).eq("id", runId);
    } catch {
      // log update failures silently
    }
  }

  try {
    const { data: run } = await supabase
      .from("pipeline_runs")
      .insert([{ status: "running" }])
      .select()
      .single();
    if (run) runId = run.id;
  } catch {
    // proceed without logging
  }

  // ── Stage 1: Scrape ────────────────────────────────────────────────────────
  let scrapeData: any = null;
  try {
    const res = await fetch(`${baseUrl}/api/scrape`, { cache: "no-store" });
    scrapeData = await res.json();
    await updateRun({ scrape_result: scrapeData });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Scrape failed";
    await updateRun({ status: "failed", error, completed_at: new Date().toISOString() });
    return NextResponse.json({ error, stage: "scrape" }, { status: 500 });
  }

  // ── Stage 2: Analyze ───────────────────────────────────────────────────────
  let analyzeData: any = null;
  try {
    const res = await fetch(`${baseUrl}/api/analyze`, { cache: "no-store" });
    analyzeData = await res.json();
    await updateRun({ analyze_result: analyzeData });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Analyze failed";
    await updateRun({ status: "failed", error, completed_at: new Date().toISOString() });
    return NextResponse.json({ error, stage: "analyze" }, { status: 500 });
  }

  // ── Stage 3: Generate ideas ────────────────────────────────────────────────
  let ideasData: any = null;
  try {
    const res = await fetch(`${baseUrl}/api/generate-ideas`, { cache: "no-store" });
    ideasData = await res.json();
    await updateRun({ ideas_result: ideasData });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Ideas generation failed";
    await updateRun({ status: "failed", error, completed_at: new Date().toISOString() });
    return NextResponse.json({ error, stage: "generate-ideas" }, { status: 500 });
  }

  // ── Complete ───────────────────────────────────────────────────────────────
  await updateRun({ status: "complete", completed_at: new Date().toISOString() });

  return NextResponse.json({
    success: true,
    runId,
    pipeline: {
      scrape: scrapeData,
      analyze: analyzeData,
      generateIdeas: ideasData,
    },
  });
}
