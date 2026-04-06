import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { canManageAgenticaLibrary, getCurrentTeamRole } from "@/lib/team-role";

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = await getCurrentTeamRole(supabase, user);

  return NextResponse.json({
    role,
    can_manage_library: canManageAgenticaLibrary(role),
  });
}
