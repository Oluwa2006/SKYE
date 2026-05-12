import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

// ─── Product Analysis ─────────────────────────────────────────────────────────
//
// Accepts an array of product image URLs (already stored in Supabase Storage).
// Sends all images to Gemini Vision in a single call — Gemini describes the
// product from every angle and returns a structured product_context JSON.
// The output is saved to projects.product_context and returned to the caller.

interface ProductContext {
  product_type:             string;   // e.g. "gourmet beef burger"
  product_name:             string;   // inferred name or category
  primary_color:            string;
  secondary_colors:         string[];
  material:                 string;
  texture:                  string;   // e.g. "toasted sesame bun, charred beef patty"
  distinctive_features:     string;   // what makes it stand out visually
  hero_angle:               string;   // best angle for the ad: "3/4 elevated close-up"
  size_and_form:            string;   // e.g. "compact handheld device" / "tall glass bottle"
  brand_visible:            boolean;  // is branding / logo visible on the product
  ad_visual_recommendation: string;   // e.g. "slow zoom into cheese pull, steam rising"
  category:                 string;   // food | beverage | apparel | tech | beauty | home | other
  target_audience:          string;   // inferred from product appearance
  brand_fit:                string;   // what type of brand this suits
}

async function analyzeProductImages(imageUrls: string[]): Promise<ProductContext> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Build image parts — fetch each URL and send as inline data
  const imageParts = await Promise.all(
    imageUrls.map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch product image: ${url}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      return {
        inlineData: {
          mimeType: contentType,
          data: buffer.toString("base64"),
        },
      };
    }),
  );

  const result = await model.generateContent([
    ...imageParts,
    {
      text: `You are a senior product photographer and creative director analyzing product images for an AI video ad campaign.

You are looking at ${imageUrls.length} photo(s) of the same product from different angles. Analyze all images together and return ONLY valid JSON — no markdown, no extra text:

{
  "product_type": "specific product type (e.g. 'gourmet beef burger', 'wireless earbuds', 'vitamin supplement bottle')",
  "product_name": "inferred product name or descriptive label",
  "primary_color": "dominant color (e.g. 'matte black', 'white', 'amber')",
  "secondary_colors": ["accent color 1", "accent color 2"],
  "material": "material description (e.g. 'premium leather', 'brushed aluminum', 'glass')",
  "texture": "surface texture description relevant to how it looks in video (e.g. 'glossy smooth', 'matte soft-touch', 'rough stone')",
  "distinctive_features": "the 1-2 most visually striking features that make this product stand out on camera",
  "hero_angle": "which angle shows the product best for video (e.g. '3/4 elevated close-up', 'front face-on', 'overhead flat lay')",
  "size_and_form": "compact | medium | large — plus form factor (e.g. 'compact cylindrical bottle', 'wide flat packaging')",
  "brand_visible": false,
  "ad_visual_recommendation": "specific cinematic recommendation for how to feature this product in motion (e.g. 'slow push-in revealing steam rising', 'rotating 360 on white surface', 'hand picks up product with natural light')",
  "category": "one of: food | beverage | apparel | tech | beauty | home | fitness | other",
  "target_audience": "inferred target audience from product appearance",
  "brand_fit": "1 sentence: what type of brand or campaign this product suits"
}`,
    },
  ]);

  const text = result.response.text().trim();
  const clean = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(clean) as ProductContext;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const admin    = createSupabaseAdmin();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { project_id, images } = body as { project_id?: string; images?: string[] };

  if (!images || !Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: "images array is required" }, { status: 400 });
  }

  if (images.length > 8) {
    return NextResponse.json({ error: "Maximum 8 images per analysis" }, { status: 400 });
  }

  let productContext: ProductContext;
  try {
    productContext = await analyzeProductImages(images);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Product analysis failed";
    console.error("[product/analyze]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // If a project_id was provided, save the result back to the project
  if (project_id) {
    const { error: updateErr } = await admin
      .from("projects")
      .update({ product_context: productContext, product_images: images })
      .eq("id", project_id);

    if (updateErr) {
      console.error("[product/analyze] failed to save to project:", updateErr.message);
      // Non-fatal — still return the analysis
    }
  }

  return NextResponse.json({ product_context: productContext });
}
