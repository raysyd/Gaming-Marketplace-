"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { loadSupabase } from "@/lib/supabase/lazy-client";
import { hasSupabase } from "@/lib/supabase/config";

type AuthUser = { id: string; email: string } | null;

const AuthCtx = createContext<{ user: AuthUser; loading: boolean }>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  // Nothing to wait for when Supabase isn't configured, so don't render a
  // loading placeholder that never resolves into anything.
  const [loading, setLoading] = useState(hasSupabase);

  useEffect(() => {
    if (!hasSupabase) {
      setLoading(false);
      return;
    }
    let alive = true;
    let unsubscribe = () => {};
    loadSupabase().then((supabase) => {
      if (!alive) return;
      if (!supabase) {
        setLoading(false);
        return;
      }
      supabase.auth.getUser().then(({ data }) => {
        if (!alive) return;
        setUser(
          data.user ? { id: data.user.id, email: data.user.email ?? "" } : null
        );
        setLoading(false);
      });

      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
        setUser(
          session?.user
            ? { id: session.user.id, email: session.user.email ?? "" }
            : null
        );
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading }}>{children}</AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
