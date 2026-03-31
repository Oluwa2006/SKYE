import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) || "brand";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext  = file.name.split(".").pop() ?? "png";
  const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from("brand-assets")
    .upload(name, buffer, { contentType: file.type, upsert: true });

  if (error) {
    // Bucket might not exist — try creating it first
    await supabaseAdmin.storage.createBucket("brand-assets", { public: true });
    const { error: e2 } = await supabaseAdmin.storage
      .from("brand-assets")
      .upload(name, buffer, { contentType: file.type, upsert: true });
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  }

  const { data } = supabaseAdmin.storage.from("brand-assets").getPublicUrl(name);
  return NextResponse.json({ url: data.publicUrl });
}
