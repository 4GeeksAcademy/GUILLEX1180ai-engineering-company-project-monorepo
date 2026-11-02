"use client";

import { useState, type FormEvent } from "react";

import { useAuthUser } from "@/components/auth/AuthUserContext";
import { logout, updateMyProfile } from "@/services/api";
import Link from "next/link";

export default function AccountProfilePage() {
  const user = useAuthUser();
  const [name, setName] = useState(user.profile?.name ?? "");
  const [phone, setPhone] = useState(user.profile?.phone ?? "");
  const [address, setAddress] = useState(user.profile?.address ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage("");
    setError("");
    if (name.trim() && name.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.");
      return;
    }

    setIsSaving(true);
    try {
      const profile = await updateMyProfile({
        name: name.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
      });
      setName(profile.name ?? "");
      setPhone(profile.phone ?? "");
      setAddress(profile.address ?? "");
      setMessage("Perfil actualizado correctamente.");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el perfil.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase text-forest">Backoffice · Cuenta</p>
          <h1 className="mt-2 text-3xl font-bold">Mi perfil</h1>
          <p className="mt-2 text-muted">Gestiona tus datos de contacto de TrackFlow.</p>
        </div>
        <div className="flex gap-3">
          <Link className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white" href="/account/change-password">Cambiar contraseña</Link>
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-white" onClick={logout} type="button">Cerrar sesión</button>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Datos de cuenta">
        <div><label className="block text-sm font-medium" htmlFor="account-email">Email</label><input id="account-email" className="mt-1 w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2" value={user.email} readOnly /></div>
        <div><label className="block text-sm font-medium" htmlFor="account-role">Rol</label><input id="account-role" className="mt-1 w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2" value={user.role} readOnly /></div>
      </section>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div><label className="block text-sm font-medium" htmlFor="profile-name">Nombre</label><input id="profile-name" autoComplete="name" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></div>
        <div><label className="block text-sm font-medium" htmlFor="profile-phone">Teléfono</label><input id="profile-phone" type="tel" autoComplete="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></div>
        <div><label className="block text-sm font-medium" htmlFor="profile-address">Dirección</label><textarea id="profile-address" autoComplete="street-address" maxLength={500} rows={3} value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2" /></div>
        {message && <p className="text-sm text-emerald-800" role="status" aria-live="polite">{message}</p>}
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        <button disabled={isSaving} type="submit" className="inline-flex min-w-40 items-center justify-center rounded-md bg-forest px-4 py-2.5 font-semibold text-white hover:bg-forest/90 disabled:opacity-60">{isSaving ? "Guardando..." : "Guardar cambios"}</button>
      </form>
    </main>
  );
}