import { createSupabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// Handles Supabase email confirmation redirects
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServer();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      // If this user has a pending team invite, activate it
      await supabase
        .from("team_members")
        .update({ status: "active", user_id: user.id, joined_at: new Date().toISOString() })
        .eq("email", user.email!)
        .eq("status", "pending");

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
