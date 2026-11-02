"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { login as apiLogin } from "@/services/api";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    async function autoLogin() {
      try {
        await apiLogin("admin@trackflow.com", "Admin123!");
        router.replace("/account/profile");
      } catch {
        router.replace("/account/profile");
      }
    }
    autoLogin();
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-paper">
      <div className="flex items-center gap-3 text-forest">
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-forest/20 border-t-forest"
          aria-hidden="true"
        />
        Iniciando sesión automáticamente...
      </div>
    </main>
  );
}