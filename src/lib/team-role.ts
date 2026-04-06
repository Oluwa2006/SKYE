export type TeamRole = "owner" | "admin" | "member";

type RoleRow = { role?: unknown } | null;

type RoleQueryBuilder = {
  eq: (column: string, value: string) => RoleQueryBuilder;
  maybeSingle: () => Promise<{ data: RoleRow }>;
};

type CountQueryBuilder = {
  eq: (column: string, value: string) => Promise<{ count: number | null }>;
};

type SupabaseLike = {
  from: (table: string) => {
    select: {
      (columns: string): RoleQueryBuilder;
      (columns: string, options: { count: "exact"; head: true }): CountQueryBuilder;
    };
  };
};

function normalizeTeamRole(value: unknown): TeamRole | null {
  return value === "owner" || value === "admin" || value === "member" ? value : null;
}

export function canManageAgenticaLibrary(role: TeamRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export async function getCurrentTeamRole(
  supabase: unknown,
  user: { id: string; email?: string | null },
): Promise<TeamRole> {
  const client = supabase as SupabaseLike;

  const activeByUser = await client
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const userRole = normalizeTeamRole(activeByUser.data?.role);
  if (userRole) return userRole;

  if (user.email) {
    const activeByEmail = await client
      .from("team_members")
      .select("role")
      .eq("email", user.email.toLowerCase())
      .eq("status", "active")
      .maybeSingle();

    const emailRole = normalizeTeamRole(activeByEmail.data?.role);
    if (emailRole) return emailRole;
  }

  const activeCount = await client
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  if ((activeCount.count ?? 0) === 0) return "owner";
  return "member";
}
