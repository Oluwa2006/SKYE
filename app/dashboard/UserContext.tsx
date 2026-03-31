"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-client";

export type AppUser = {
  id: string;
  email: string;
  display_name: string;
} | null;

const UserContext = createContext<AppUser>(null);

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
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          display_name:
            session.user.user_metadata?.display_name ||
            session.user.email?.split("@")[0] ||
            "User",
        });
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
