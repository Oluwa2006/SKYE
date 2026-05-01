"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-client";

export type AppUser = {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
} | null;

const UserContext = createContext<AppUser>(null);

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";

function buildUser(supaUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): AppUser {
  const email = supaUser.email ?? "";
  return {
    id:           supaUser.id,
    email,
    display_name:
      (supaUser.user_metadata?.display_name as string) ||
      email.split("@")[0] ||
      "User",
    is_admin: ADMIN_EMAIL ? email === ADMIN_EMAIL : false,
  };
}

export function UserProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial: AppUser;
}) {
  const [user, setUser] = useState<AppUser>(initial);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser(buildUser(session.user));
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}

export function useIsAdmin() {
  return useContext(UserContext)?.is_admin ?? false;
}
