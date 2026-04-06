import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { openai } from "@/lib/openai";

type VariationStrength = "low" | "medium" | "high";

type BaseAdLike = {
  hook: string;
  script: string;
  cta: string;
};

type CandidateVariant = {
  hook: string;
  script: string;
  cta: string;
};

type StrengthConfig = {
  temperature: number;
  baseMin: number;
  baseMax: number;
  siblingMax: number;
  instruction: string;
};

const STRENGTH_CONFIG: Record<VariationStrength, StrengthConfig> = {
  low: {
    temperature: 0.45,
    baseMin: 0.6,
    baseMax: 0.96,
    siblingMax: 0.92,
    instruction: "Keep the same angle. Only make light wording changes to the hook, light phrasing changes to the script, and a very close CTA variation.",
  },
  medium: {
    temperature: 0.72,
    baseMin: 0.34,
    baseMax: 0.84,
    siblingMax: 0.84,
    instruction: "Change the hook direction and rewrite meaningful parts of the script, but keep the same offer and overall strategy. CTA can be rephrased.",
  },
  high: {
    temperature: 0.9,
    baseMin: 0.18,
    baseMax: 0.72,
    siblingMax: 0.76,
    instruction: "Push to a meaningfully different angle while staying rooted in the same product, promise, and intent. Rewrite the script strongly and change the CTA approach.",
  },
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
}

function similarityScore(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  const intersection = [...setA].filter((token) => setB.has(token)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function adSimilarity(base: BaseAdLike, variant: BaseAdLike): number {
  return (
    similarityScore(base.hook, variant.hook) +
    similarityScore(base.script, variant.script) +
    similarityScore(base.cta, variant.cta)
  ) / 3;
}

function siblingSimilarity(variant: BaseAdLike, siblings: BaseAdLike[]): number {
  if (siblings.length === 0) return 0;
  return Math.max(...siblings.map((sibling) => adSimilarity(sibling, variant)));
}

function signature(variant: BaseAdLike): string {
  return [
    normalizeText(variant.hook).toLowerCase(),
    normalizeText(variant.script).toLowerCase(),
    normalizeText(variant.cta).toLowerCase(),
  ].join("||");
}

function sanitizeVariant(raw: unknown): CandidateVariant | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;
  const hook = normalizeText(candidate.hook);
  const script = normalizeText(candidate.script);
  const cta = normalizeText(candidate.cta);
  if (!hook || !script || !cta) return null;
  return { hook, script, cta };
}

function getBaseMeta(baseAd: Record<string, unknown>) {
  return {
    adType: normalizeText(baseAd.ad_type) || normalizeText(baseAd.style_category) || "general",
    angle: normalizeText(baseAd.angle) || normalizeText(baseAd.hook),
  };
}

async function generateCandidates(args: {
  baseAd: Record<string, unknown>;
  strength: VariationStrength;
  batchSize: number;
  accepted: CandidateVariant[];
}): Promise<CandidateVariant[]> {
  const { baseAd, strength, batchSize, accepted } = args;
  const config = STRENGTH_CONFIG[strength];
  const { adType, angle } = getBaseMeta(baseAd);

  const acceptedContext = accepted.length
    ? accepted
        .map((variant, index) => `${index + 1}. Hook: ${variant.hook}\n   Script: ${variant.script}\n   CTA: ${variant.cta}`)
        .join("\n")
    : "None yet.";

  const prompt = `You are building ad variants for controlled creative testing.

Base ad:
- Ad type: ${adType}
- Angle: ${angle}
- Hook: ${normalizeText(baseAd.hook)}
- Script: ${normalizeText(baseAd.script)}
- CTA: ${normalizeText(baseAd.cta)}

Generate ${batchSize} candidate variants.

Rules:
- Only mutate hook, script wording, and CTA.
- Do not invent a different product, offer, audience, or channel.
- Keep the ad type the same.
- ${config.instruction}
- Make every candidate clearly distinct from the already accepted variants.
- Avoid repeating the same phrasing patterns.
- Keep each script concise and usable as ad copy.

Already accepted variants:
${acceptedContext}

Return ONLY valid JSON in this exact shape:
{
  "variants": [
    { "hook": "...", "script": "...", "cta": "..." }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You write direct-response ad variants and return strict JSON only.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: config.temperature,
  });

  const raw = completion.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(raw) as { variants?: unknown[] };
  return (parsed.variants ?? []).map(sanitizeVariant).filter((variant): variant is CandidateVariant => variant !== null);
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const baseAdId = normalizeText(body.base_ad_id);
  const requestedStrength = normalizeText(body.variation_strength) as VariationStrength;
  const variationStrength: VariationStrength = ["low", "medium", "high"].includes(requestedStrength)
    ? requestedStrength
    : "medium";
  const requestedCount = Math.min(10, Math.max(1, Number(body.number_of_variants ?? body.num_variants ?? 3) || 3));

  if (!baseAdId) {
    return NextResponse.json({ error: "base_ad_id is required" }, { status: 400 });
  }

  const { data: baseAd, error: baseErr } = await supabase
    .from("base_ads")
    .select("*")
    .eq("id", baseAdId)
    .single();

  if (baseErr || !baseAd) {
    return NextResponse.json({ error: "Base ad not found" }, { status: 404 });
  }

  const { data: variantRequest, error: requestError } = await supabase
    .from("variant_requests")
    .insert({
      base_ad_id: baseAdId,
      variation_strength: variationStrength,
      num_variants: requestedCount,
      requested_by: user.id,
      status: "processing",
    })
    .select("*")
    .single();

  if (requestError || !variantRequest) {
    return NextResponse.json({ error: requestError?.message ?? "Failed to create variant request" }, { status: 500 });
  }

  const config = STRENGTH_CONFIG[variationStrength];
  const accepted: CandidateVariant[] = [];
  const outputs: Array<Record<string, unknown> & { sibling_similarity: number }> = [];
  const seen = new Set<string>();
  let filteredOut = 0;
  let attempts = 0;

  try {
    for (let pass = 0; pass < 4 && accepted.length < requestedCount; pass += 1) {
      const remaining = requestedCount - accepted.length;
      const batchSize = Math.min(remaining + 2, 6);
      const candidates = await generateCandidates({
        baseAd,
        strength: variationStrength,
        batchSize,
        accepted,
      });

      for (const candidate of candidates) {
        if (accepted.length >= requestedCount) break;

        attempts += 1;
        const key = signature(candidate);
        if (seen.has(key)) {
          filteredOut += 1;
          continue;
        }
        seen.add(key);

        const baseSimilarity = adSimilarity(baseAd as BaseAdLike, candidate);
        const closestSibling = siblingSimilarity(candidate, accepted);

        const tooFarFromBase = baseSimilarity < config.baseMin;
        const tooCloseToBase = baseSimilarity > config.baseMax;
        const tooCloseToSibling = closestSibling > config.siblingMax;

        if (tooFarFromBase || tooCloseToBase || tooCloseToSibling) {
          filteredOut += 1;
          continue;
        }

        const { data: output, error: outputError } = await supabase
          .from("variant_outputs")
          .insert({
            request_id: variantRequest.id,
            base_ad_id: baseAdId,
            hook: candidate.hook,
            script: candidate.script,
            cta: candidate.cta,
            similarity_score: baseSimilarity,
            was_rejected: false,
            rejection_reason: null,
            status: "draft",
          })
          .select("*")
          .single();

        if (outputError || !output) {
          throw new Error(outputError?.message ?? "Failed to save approved variant");
        }

        accepted.push(candidate);
        outputs.push({
          ...output,
          sibling_similarity: closestSibling,
        });
      }
    }

    await supabase
      .from("variant_requests")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", variantRequest.id);

    const message = outputs.length === requestedCount
      ? `Generated ${outputs.length} approved variants.`
      : `Generated ${outputs.length} approved variants out of ${requestedCount} requested. ${filteredOut} candidates were filtered out for similarity.`;

    return NextResponse.json({
      request_id: variantRequest.id,
      base_ad_id: baseAdId,
      variation_strength: variationStrength,
      requested: requestedCount,
      accepted: outputs.length,
      rejected: filteredOut,
      attempts,
      message,
      variants: outputs,
    });
  } catch (error) {
    await supabase
      .from("variant_requests")
      .update({ status: "failed" })
      .eq("id", variantRequest.id);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate variants" },
      { status: 500 },
    );
  }
}
