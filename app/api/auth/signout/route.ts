import { createSupabaseServer } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  // Use the request origin so this works on any deployment (Vercel, localhost, etc.)
  const origin = req.nextUrl.origin;
  return NextResponse.redirect(new URL("/login", origin), { status: 302 });
}
