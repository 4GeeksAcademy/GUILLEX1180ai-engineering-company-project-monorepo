"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ApiError, getApiFieldErrors, login, registerUser } from "@/services/api";

type RegisterForm = { email: string; password: string; name: string; phone: string; address: string };

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<RegisterForm>();

  async function onSubmit(values: RegisterForm): Promise<void> {
    setServerError("");
    const payload = {
      email: values.email.trim(),
      password: values.password,
      ...(values.name.trim() && { name: values.name.trim() }),
      ...(values.phone.trim() && { phone: values.phone.trim() }),
      ...(values.address.trim() && { address: values.address.trim() }),
    };
    let registered = false;
    try {
      await registerUser(payload);
      registered = true;
      await login(payload.email, payload.password);
      router.replace("/account/profile");
      router.refresh();
    } catch (error: unknown) {
      const fieldErrors = getApiFieldErrors(error);
      for (const field of ["email", "password", "name", "phone", "address"] as const) {
        if (fieldErrors[field]) setError(field, { type: "server", message: fieldErrors[field] });
      }
      setServerError(registered ? "Cuenta creada, pero no se pudo iniciar sesión. Accede desde login." : error instanceof ApiError && error.status === 409 ? "Ya existe una cuenta con ese email." : error instanceof Error ? error.message : "No se pudo crear la cuenta.");
    }
  }

  return (
    <main className="min-h-screen bg-paper px-6 py-12">
      <section className="mx-auto max-w-xl">
        <Link className="text-lg font-bold text-forest" href="/">TrackFlow</Link>
        <p className="mt-10 text-xs font-semibold uppercase text-forest">Portal privado</p>
        <h1 className="mt-2 text-3xl font-bold">Crear cuenta</h1>
        <p className="mt-2 text-muted">Registra tu empresa en TrackFlow.</p>
        <form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="sm:col-span-2"><label className="block text-sm font-medium" htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2" {...register("email", { required: "Introduce tu email.", pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Introduce un email válido." } })} />{errors.email && <p className="mt-1 text-sm text-red-700">{errors.email.message}</p>}</div>
          <div className="sm:col-span-2"><label className="block text-sm font-medium" htmlFor="password">Contraseña</label><input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2" {...register("password", { required: "Introduce una contraseña.", minLength: { value: 8, message: "Usa al menos 8 caracteres." }, validate: (value) => new TextEncoder().encode(value).length <= 72 || "La contraseña supera el límite de bcrypt." })} />{errors.password && <p className="mt-1 text-sm text-red-700">{errors.password.message}</p>}</div>
          <div><label className="block text-sm font-medium" htmlFor="name">Nombre (opcional)</label><input id="name" autoComplete="name" className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2" {...register("name", { validate: (value) => !value || value.trim().length >= 2 || "Usa al menos 2 caracteres." })} />{errors.name && <p className="mt-1 text-sm text-red-700">{errors.name.message}</p>}</div>
          <div><label className="block text-sm font-medium" htmlFor="phone">Teléfono (opcional)</label><input id="phone" type="tel" autoComplete="tel" className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2" {...register("phone")} />{errors.phone && <p className="mt-1 text-sm text-red-700">{errors.phone.message}</p>}</div>
          <div className="sm:col-span-2"><label className="block text-sm font-medium" htmlFor="address">Dirección (opcional)</label><textarea id="address" autoComplete="street-address" rows={3} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2" {...register("address", { maxLength: { value: 500, message: "Máximo 500 caracteres." } })} />{errors.address && <p className="mt-1 text-sm text-red-700">{errors.address.message}</p>}</div>
          {serverError && <p className="sm:col-span-2 text-sm text-red-700" role="alert">{serverError}</p>}
          <button disabled={isSubmitting} type="submit" className="sm:col-span-2 rounded-md bg-forest px-4 py-2.5 font-semibold text-white hover:bg-forest/90 disabled:opacity-60">{isSubmitting ? "Creando cuenta..." : "Registrarme"}</button>
        </form>
        <p className="mt-6 text-sm text-muted">¿Ya tienes cuenta? <Link className="font-semibold text-forest underline" href="/login">Inicia sesión</Link></p>
      </section>
    </main>
  );
}