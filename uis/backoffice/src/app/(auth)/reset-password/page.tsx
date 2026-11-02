"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { ApiError, getApiFieldErrors, resetPassword } from "@/services/api";

type ResetPasswordForm = {
  newPassword: string;
  confirmPassword: string;
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [checkingToken, setCheckingToken] = useState(true);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, getValues, setError, formState: { errors, isSubmitting } } =
    useForm<ResetPasswordForm>();

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token");
    setToken(value);
    setCheckingToken(false);
    if (!value) setServerError("El enlace de restablecimiento no contiene un token válido.");
  }, []);

  async function onSubmit(values: ResetPasswordForm): Promise<void> {
    setServerError("");
    if (!token) {
      setServerError("El enlace de restablecimiento no es válido.");
      return;
    }

    try {
      await resetPassword(token, values.newPassword);
      router.replace("/login?passwordReset=success");
    } catch (error: unknown) {
      const fieldErrors = getApiFieldErrors(error);
      if (fieldErrors.new_password) {
        setError("newPassword", { type: "server", message: fieldErrors.new_password });
      }
      setServerError(
        error instanceof ApiError && error.status === 400
          ? "El enlace es inválido, expiró o ya fue utilizado. Solicita uno nuevo."
          : error instanceof Error
            ? error.message
            : "No se pudo restablecer la contraseña.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-12">
      <section className="mx-auto max-w-md">
        <Link className="text-lg font-bold text-forest" href="/">TrackFlow</Link>
        <p className="mt-10 text-xs font-semibold uppercase text-forest">Seguridad de cuenta</p>
        <h1 className="mt-2 text-3xl font-bold">Nueva contraseña</h1>
        {checkingToken ? (
          <p className="mt-6" role="status">Verificando enlace...</p>
        ) : !token ? (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-red-900" role="alert">
            <p>{serverError}</p>
            <Link className="mt-3 inline-block font-semibold underline" href="/forgot-password">Solicitar otro enlace</Link>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
              <label className="block text-sm font-medium" htmlFor="newPassword">Nueva contraseña</label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.newPassword)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                {...register("newPassword", {
                  required: "Introduce una nueva contraseña.",
                  minLength: { value: 8, message: "Usa al menos 8 caracteres." },
                  validate: (value) => new TextEncoder().encode(value).length <= 72 || "Máximo 72 bytes para bcrypt.",
                })}
              />
              {errors.newPassword && <p className="mt-1 text-sm text-red-700">{errors.newPassword.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium" htmlFor="confirmPassword">Confirmar contraseña</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                {...register("confirmPassword", {
                  required: "Confirma la nueva contraseña.",
                  validate: (value) => value === getValues("newPassword") || "Las contraseñas no coinciden.",
                })}
              />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-700">{errors.confirmPassword.message}</p>}
            </div>
            {serverError && (
              <div className="text-sm text-red-700" role="alert">
                <p>{serverError}</p>
                <Link className="mt-2 inline-block font-semibold underline" href="/forgot-password">Solicitar otro enlace</Link>
              </div>
            )}
            <button disabled={isSubmitting} type="submit" className="w-full rounded-md bg-forest px-4 py-2.5 font-semibold text-white disabled:opacity-60">
              {isSubmitting ? "Guardando..." : "Restablecer contraseña"}
            </button>
          </form>
        )}
        <p className="mt-6 text-sm"><Link className="font-semibold text-forest underline" href="/login">Volver al login</Link></p>
      </section>
    </main>
  );
}