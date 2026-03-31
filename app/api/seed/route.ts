import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const SEED_SOURCES = [
  {
    name: "Shake Shack",
    platform: "website",
    url: "https://www.shakeshack.com/food/burgers/",
    niche: "fast casual burgers",
  },
  {
    name: "Sweetgreen",
    platform: "website",
    url: "https://www.sweetgreen.com/menu",
    niche: "healthy fast casual salads",
  },
  {
    name: "CAVA",
    platform: "website",
    url: "https://cava.com/menu",
    niche: "mediterranean fast casual",
  },
  {
    name: "Panera Bread",
    platform: "website",
    url: "https://www.panerabread.com/en-us/home.html",
    niche: "fast casual bakery cafe",
  },
  {
    name: "Chipotle",
    platform: "website",
    url: "https://www.chipotle.com/",
    niche: "fast casual mexican",
  },
];

export async function GET() {
  const { data, error } = await supabase
    .from("sources")
    .insert(SEED_SOURCES)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    seeded: data?.length ?? 0,
    sources: data,
  });
}
