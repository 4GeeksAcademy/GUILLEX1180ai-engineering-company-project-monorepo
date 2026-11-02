"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { AuthMeResponse } from "@/services/api";

const AuthUserContext = createContext<AuthMeResponse | null>(null);

export function AuthUserProvider({
  user,
  children,
}: {
  user: AuthMeResponse;
  children: ReactNode;
}) {
  return <AuthUserContext.Provider value={user}>{children}</AuthUserContext.Provider>;
}

export function useAuthUser(): AuthMeResponse {
  const user = useContext(AuthUserContext);
  if (!user) throw new Error("useAuthUser requiere AuthGuard.");
  return user;
}