"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ApiError, requestPasswordReset } from "@/services/api";

type ForgotPasswordForm = { email: string };

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<ForgotPasswordForm>();

  async function onSubmit(values: ForgotPasswordForm): Promise<void> {
    setServerError("");
    try {
      await requestPasswordReset(values.email.trim());
      // The backend deliberately returns the same success response for any email.
      setSent(true);
    } catch (error: unknown) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "No se pudo procesar la solicitud.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-12">
      <section className="mx-auto max-w-md">
        <Link className="text-lg font-bold text-forest" href="/">TrackFlow</Link>
        <p className="mt-10 text-xs font-semibold uppercase text-forest">Seguridad de cuenta</p>
        <h1 className="mt-2 text-3xl font-bold">Restablecer contraseña</h1>
        {sent ? (
          <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-950" role="status" aria-live="polite">
            <p>Si esa dirección está registrada, recibirás un enlace de recuperación en breve.</p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-muted">Introduce el email asociado a tu cuenta.</p>
            <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div>
                <label className="block text-sm font-medium" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  {...register("email", {
                    required: "Introduce tu email.",
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Introduce un email válido." },
                  })}
                />
                {errors.email && <p className="mt-1 text-sm text-red-700">{errors.email.message}</p>}
              </div>
              {serverError && <p role="alert" className="text-sm text-red-700">{serverError}</p>}
              <button disabled={isSubmitting} type="submit" className="w-full rounded-md bg-forest px-4 py-2.5 font-semibold text-white disabled:opacity-60">
                {isSubmitting ? "Enviando..." : "Enviar enlace"}
              </button>
            </form>
          </>
        )}
        <p className="mt-6 text-sm"><Link className="font-semibold text-forest underline" href="/login">Volver al login</Link></p>
      </section>
    </main>
  );
}