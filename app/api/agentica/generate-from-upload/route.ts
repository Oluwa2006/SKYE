import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { openai } from "@/lib/openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { randomUUID } from "crypto";

export const maxDuration = 60;

interface AdContent {
  title: string;
  hook: string;
  script: string;
  cta: string;
  ad_type: string;
  angle: string;
  style_category: string;
  brand_fit: string;
}

// Analyze a product image with GPT-4o Vision
async function analyzeImage(fileUrl: string): Promise<AdContent> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: fileUrl, detail: "high" },
          },
          {
            type: "text",
            text: `You are a senior direct-response creative director. Analyze this product image and generate a complete, ready-to-use ad brief.

Identify the product, its category, core benefit, and target audience from the image alone.

Return ONLY valid JSON — no markdown, no explanation:
{
  "title": "internal name for this ad (product + angle, e.g. 'AirPods — Focus Angle')",
  "hook": "scroll-stopping first line — specific to THIS product, creates instant desire or curiosity, under 12 words",
  "script": "2-3 sentence ad body — benefit-led, conversational tone, addresses a real pain or desire, ends with soft urgency",
  "cta": "action CTA — short and specific (e.g. 'Shop Now', 'Get Yours Today', 'Try Free for 30 Days')",
  "ad_type": "one of: product demo | lifestyle | testimonial | offer | ugc | educational",
  "angle": "one of: problem | desire | curiosity | social proof | urgency | value",
  "style_category": "one of: cinematic | lifestyle | product | energetic | text-forward",
  "brand_fit": "1 sentence: what type of brand or audience this product is for"
}

Be specific to what you actually see. Do not write generic copy.`,
          },
        ],
      },
    ],
    max_tokens: 600,
  });

  const text = response.choices[0].message.content?.trim() ?? "{}";
  const clean = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(clean) as AdContent;
}

// Gemini video analysis — watch the actual video to extract product + style context
interface GeminiVideoContext {
  product_description: string;
  visual_style: string;
  mood: string;
  pacing: string;
  shot_type: string;
  camera_movement: string;
  lighting: string;
  suggested_angle: string;
  suggested_style_category: string;
}

async function analyzeVideoWithGemini(buffer: Buffer): Promise<GeminiVideoContext> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "video/mp4",
        data: buffer.toString("base64"),
      },
    },
    {
      text: `You are a senior creative director analyzing a product video for an ad campaign.

Analyze this video and return ONLY valid JSON — no markdown, no extra text:
{
  "product_description": "what product is shown and what it does or offers",
  "visual_style": "precise style description (e.g. clean minimal white, cinematic dark warm, bright outdoor lifestyle)",
  "mood": "energetic | calm | premium | playful | urgent | authentic | aspirational",
  "pacing": "slow | medium | fast",
  "shot_type": "close up | wide | overhead | POV | tracking | medium shot",
  "camera_movement": "static | slow push-in | pan | handheld | tracking",
  "lighting": "studio | golden hour | daylight | backlit | soft diffused | neon | mixed",
  "suggested_angle": "one of: problem | desire | curiosity | social proof | urgency | value",
  "suggested_style_category": "one of: cinematic | lifestyle | product | energetic | text-forward"
}`,
    },
  ]);

  const text = result.response.text().trim();
  const clean = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(clean) as GeminiVideoContext;
}

// For video uploads — Gemini watches the video, GPT writes the ad brief
async function generateAdFromVideo(fileName: string, geminiCtx: GeminiVideoContext): Promise<AdContent> {
  const productHint = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a senior direct-response creative director who writes high-converting ad copy. Return strict JSON only.",
      },
      {
        role: "user",
        content: `A product video was uploaded for an ad campaign. File: "${productHint}".

Video analysis from AI vision:
- Product: ${geminiCtx.product_description}
- Visual style: ${geminiCtx.visual_style}
- Mood: ${geminiCtx.mood}
- Lighting: ${geminiCtx.lighting}
- Shot type: ${geminiCtx.shot_type}
- Camera: ${geminiCtx.camera_movement}
- Pacing: ${geminiCtx.pacing}

Generate a compelling, conversion-focused ad brief grounded in what was actually seen in this video.

Return ONLY valid JSON — no markdown:
{
  "title": "internal name (product + angle)",
  "hook": "scroll-stopping opening line, under 12 words, specific to this product",
  "script": "2-3 sentences — benefit-led, conversational, addresses a real pain or desire, ends with soft urgency",
  "cta": "short action CTA (e.g. 'Shop Now', 'Try Free', 'Get Yours Today')",
  "ad_type": "one of: product demo | lifestyle | testimonial | offer | ugc | educational",
  "angle": "${geminiCtx.suggested_angle}",
  "style_category": "${geminiCtx.suggested_style_category}",
  "brand_fit": "1 sentence: what type of brand or audience this product is for"
}`,
      },
    ],
    max_tokens: 500,
    temperature: 0.6,
  });

  const text = response.choices[0].message.content?.trim() ?? "{}";
  const clean = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(clean) as AdContent;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const admin    = createSupabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
      return NextResponse.json({ error: "Only image or video files accepted" }, { status: 400 });
    }

    // 1. Upload to Supabase Storage
    const id  = randomUUID();
    const ext = file.name.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
    const storagePath = `product-uploads/${id}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    console.log("[generate-from-upload] uploading:", storagePath);

    const { error: uploadErr } = await admin.storage
      .from("reference-library")
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (uploadErr) {
      console.error("[generate-from-upload] storage upload failed:", uploadErr);
      return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from("reference-library").getPublicUrl(storagePath);
    const fileUrl = urlData.publicUrl;
    console.log("[generate-from-upload] uploaded:", fileUrl);

    // 2. AI Analysis — image uses GPT-4o Vision, video uses Gemini watch + GPT write
    let adContent: AdContent;
    try {
      console.log("[generate-from-upload] running AI analysis...");
      if (isImage) {
        adContent = await analyzeImage(fileUrl);
      } else {
        const GEMINI_MAX_BYTES = 15 * 1024 * 1024; // 15 MB inline limit
        if (buffer.byteLength <= GEMINI_MAX_BYTES) {
          console.log("[generate-from-upload] running Gemini video analysis...");
          const geminiCtx = await analyzeVideoWithGemini(buffer);
          console.log("[generate-from-upload] Gemini result:", geminiCtx);
          adContent = await generateAdFromVideo(file.name, geminiCtx);
        } else {
          console.log(`[generate-from-upload] video too large for Gemini (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB), using GPT text fallback`);
          adContent = await generateAdFromVideo(file.name, {
            product_description: "product shown in uploaded video",
            visual_style: "professional video",
            mood: "aspirational",
            pacing: "medium",
            shot_type: "medium shot",
            camera_movement: "static",
            lighting: "daylight",
            suggested_angle: "desire",
            suggested_style_category: "lifestyle",
          });
        }
      }
      console.log("[generate-from-upload] AI result:", adContent);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      console.error("[generate-from-upload] AI analysis failed:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }

    // 3. Create base ad in DB using admin client (bypasses RLS)
    console.log("[generate-from-upload] inserting base_ad...");
    const { data: baseAd, error: insertErr } = await admin
      .from("base_ads")
      .insert({
        title:          adContent.title,
        hook:           adContent.hook,
        script:         adContent.script,
        cta:            adContent.cta,
        ad_type:        adContent.ad_type,
        angle:          adContent.angle,
        style_category: adContent.style_category ?? "lifestyle",
        engine:         "higgsfield",
        video_url:      isVideo ? fileUrl : null,
        is_active:      true,
        created_by:     user.id,
      })
      .select("*")
      .single();

    if (insertErr) {
      console.error("[generate-from-upload] DB insert failed:", JSON.stringify(insertErr));
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      base_ad:   baseAd,
      file_url:  fileUrl,
      file_type: isVideo ? "video" : "image",
      analysis:  adContent,
    }, { status: 201 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate-from-upload] UNCAUGHT:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
