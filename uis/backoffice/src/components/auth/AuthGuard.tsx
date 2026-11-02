"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { AuthUserProvider } from "@/components/auth/AuthUserContext";
import {
  ApiError,
  getAccessToken,
  getCurrentUser,
  login,
  type AuthMeResponse,
} from "@/services/api";

type GuardState =
  | { status: "checking" }
  | { status: "authenticated"; user: AuthMeResponse }
  | { status: "error"; message: string };

export default function AuthGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GuardState>({ status: "checking" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function verifySession(): Promise<void> {
      setState({ status: "checking" });

      // 1. Si ya hay token, verificar sesión
      const token = getAccessToken();
      if (token) {
        try {
          const user = await getCurrentUser(controller.signal);
          if (active) {
            setState({ status: "authenticated", user });
            return;
          }
        } catch {
          // Token inválido → continuar a login automático
        }
      }

      // 2. Login automático con admin (sin que el usuario vea la pantalla de login)
      try {
        await login("admin@trackflow.com", "Admin123!");
        const user = await getCurrentUser(controller.signal);
        if (active) setState({ status: "authenticated", user });
      } catch (error: unknown) {
        if (!active) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "No se pudo conectar con el servidor.",
        });
      }
    }

    void verifySession();
    return () => {
      active = false;
      controller.abort();
    };
  }, [retry]);

  if (state.status === "checking") {
    return (
      <main
        className="grid min-h-screen place-items-center bg-paper"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3 text-forest">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-forest/20 border-t-forest"
            aria-hidden="true"
          />
          Conectando...
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="mx-auto max-w-lg px-6 py-20">
        <section className="border-l-4 border-coral bg-white p-6" role="alert">
          <h1 className="text-lg font-semibold">
            No se pudo conectar con el servidor
          </h1>
          <p className="mt-2 text-sm text-muted">{state.message}</p>
          <div className="mt-5">
            <button
              className="rounded-md bg-forest px-4 py-2 font-semibold text-white"
              onClick={() => setRetry((value) => value + 1)}
              type="button"
            >
              Reintentar
            </button>
          </div>
        </section>
      </main>
    );
  }

  return <AuthUserProvider user={state.user}>{children}</AuthUserProvider>;
}