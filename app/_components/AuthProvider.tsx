"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthState = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * Client-side reactive auth state. Seed `initialUser` from the server so the
 * UI renders correctly on first paint (no logged-out flash), then keep it in
 * sync via Supabase's `onAuthStateChange` (login, logout, token refresh).
 */
export default function AuthProvider({
  initialUser,
  children,
}: {
  initialUser?: User | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [loading, setLoading] = useState(initialUser === undefined);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}
