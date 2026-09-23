"use client";

import { createContext, useContext } from "react";
import type { SessionClaims } from "@/lib/auth/session";

const AuthContext = createContext<SessionClaims | null>(null);

export function AuthProvider({
  claims,
  children,
}: {
  claims: SessionClaims;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={claims}>{children}</AuthContext.Provider>;
}

export function useAuth(): SessionClaims {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
