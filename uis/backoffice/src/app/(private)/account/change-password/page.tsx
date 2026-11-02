"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";

import { changePassword } from "@/services/api";

type ChangePasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ChangePasswordPage() {
  const [message, setMessage] = useState("");
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>();

  async function onSubmit(values: ChangePasswordForm): Promise<void> {
    setMessage("");
    setServerError("");
    try {
      await changePassword(values.currentPassword, values.newPassword);
      reset();
      setMessage("Contraseña actualizada correctamente.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar la contraseña.";
      setServerError(message);
      if (message === "La contraseña actual es incorrecta") {
        setError("currentPassword", { type: "server", message });
      }
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <Link className="text-sm font-semibold text-forest underline" href="/account/profile">Volver al perfil</Link>
      <p className="mt-8 text-xs font-semibold uppercase text-forest">Seguridad de cuenta</p>
      <h1 className="mt-2 text-3xl font-bold">Cambiar contraseña</h1>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label className="block text-sm font-medium" htmlFor="currentPassword">Contraseña actual</label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.currentPassword)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
            {...register("currentPassword", { required: "Introduce tu contraseña actual." })}
          />
          {errors.currentPassword && <p className="mt-1 text-sm text-red-700">{errors.currentPassword.message}</p>}
        </div>
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
          <label className="block text-sm font-medium" htmlFor="confirmPassword">Confirmar nueva contraseña</label>
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
        {serverError && <p role="alert" className="text-sm text-red-700">{serverError}</p>}
        {message && <p role="status" aria-live="polite" className="text-sm text-emerald-800">{message}</p>}
        <button disabled={isSubmitting} type="submit" className="w-full rounded-md bg-forest px-4 py-2.5 font-semibold text-white disabled:opacity-60">
          {isSubmitting ? "Actualizando..." : "Cambiar contraseña"}
        </button>
      </form>
    </main>
  );
}