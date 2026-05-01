import { NextResponse } from "next/server";

// Lists every Gemini model available on your API key
// and whether it supports generateContent (what we need for video analysis)
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`,
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const data = await res.json();
  const models = (data.models ?? []) as {
    name: string;
    displayName: string;
    supportedGenerationMethods: string[];
  }[];

  // Split into usable vs not
  const canGenerate = models
    .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
    .map(m => ({ id: m.name.replace("models/", ""), displayName: m.displayName }));

  const liveOnly = models
    .filter(m => !m.supportedGenerationMethods?.includes("generateContent"))
    .map(m => ({ id: m.name.replace("models/", ""), displayName: m.displayName, methods: m.supportedGenerationMethods }));

  return NextResponse.json({ canGenerate, liveOnly, total: models.length });
}
