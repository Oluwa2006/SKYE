import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

// GET /api/agentica/variants/[requestId] — fetch outputs for a variant request
export async function GET(
  _req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { requestId } = params;

  const { data: request, error: reqErr } = await supabase
    .from("variant_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (reqErr || !request) {
    return NextResponse.json({ error: "Variant request not found" }, { status: 404 });
  }

  const { data: outputs, error: outErr } = await supabase
    .from("variant_outputs")
    .select("*")
    .eq("request_id", requestId)
    .order("similarity_score", { ascending: false });

  if (outErr) return NextResponse.json({ error: outErr.message }, { status: 500 });

  return NextResponse.json({ request, variants: outputs ?? [] });
}
