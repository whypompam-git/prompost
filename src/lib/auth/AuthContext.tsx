"use client";

import { createContext, useContext } from "react";
import type { Permissions } from "@/lib/permissions";
import type { StaffRole } from "@/lib/types";

export type AuthInfo = {
  staffId: string;
  name: string;
  role: StaffRole;
  permissions: Permissions;
};

const AuthContext = createContext<AuthInfo | null>(null);

export function AuthProvider({ auth, children }: { auth: AuthInfo; children: React.ReactNode }) {
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthInfo {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
