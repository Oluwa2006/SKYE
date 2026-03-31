import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateSpeech, DEFAULT_VOICE_ID } from "@/lib/elevenlabs";

export async function POST(req: NextRequest) {
  try {
    const { ideaId, voiceId = DEFAULT_VOICE_ID, languageCode = "en" } = await req.json();

    if (!ideaId) {
      return NextResponse.json({ error: "ideaId is required" }, { status: 400 });
    }

    // Fetch the idea
    const { data: idea, error: fetchError } = await supabase
      .from("ideas")
      .select("*")
      .eq("id", ideaId)
      .single();

    if (fetchError || !idea) {
      console.error("Idea fetch error:", fetchError);
      return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    }

    const scriptText = idea.script || idea.caption;

    if (!scriptText) {
      return NextResponse.json({ error: "Idea has no script or caption to narrate" }, { status: 400 });
    }

    // Mark as generating
    await supabase.from("ideas").update({ audio_status: "generating" }).eq("id", ideaId);

    // Generate audio from ElevenLabs
    const audioBuffer = await generateSpeech(scriptText, voiceId, languageCode);

    // Upload to Supabase Storage
    const fileName = `${ideaId}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from("audio")
      .upload(fileName, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      await supabase.from("ideas").update({ audio_status: "error" }).eq("id", ideaId);
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("audio").getPublicUrl(fileName);
    const audioUrl = urlData.publicUrl;

    // Update idea record
    const { data: updatedIdea, error: updateError } = await supabase
      .from("ideas")
      .update({
        audio_url: audioUrl,
        audio_status: "ready",
        voice_id: voiceId,
        generated_at: new Date().toISOString(),
      })
      .eq("id", ideaId)
      .select()
      .single();

    if (updateError) {
      console.error("Idea update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, audioUrl, idea: updatedIdea });
  } catch (err) {
    console.error("generate-voice unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Voice generation failed" },
      { status: 500 }
    );
  }
}
