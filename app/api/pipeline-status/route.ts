import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("pipeline_runs")
    .select("id, status, started_at, completed_at, error")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return NextResponse.json({ run: null });
  return NextResponse.json({ run: data });
}

// DELETE — force-reset any stuck "running" rows so the pipeline can run again
export async function DELETE() {
  const { error } = await supabase
    .from("pipeline_runs")
    .update({ status: "failed", error: "Manually reset" })
    .eq("status", "running");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
