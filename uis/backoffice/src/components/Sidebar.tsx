"use client";

import { useAuthUser } from "@/components/auth/AuthUserContext";
import Link from "next/link";
import type { JSX } from "react";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: JSX.Element;
}

export default function Sidebar(): JSX.Element {
  const pathname = usePathname();
  const user = useAuthUser();

  const navItems: NavItem[] = [
    {
      label: "Mi perfil",
      href: "/account/profile",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
        </svg>
      ),
    },
    {
      label: "Inventario",
      href: "/inventory",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M2 3a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V3z" />
          <path
            fillRule="evenodd"
            d="M3 7h14v9a1 1 0 01-1 1H4a1 1 0 01-1-1V7zm3 3a.75.75 0 000 1.5h8a.75.75 0 000-1.5H6z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      label: "Análisis de incidencias",
      href: "/incidents/analyze",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M1 2.75A.75.75 0 011.75 2h16.5a.75.75 0 010 1.5H18v8.75A2.75 2.75 0 0115.25 15h-2.5a.75.75 0 01-.75-.75 2.25 2.25 0 00-4.5 0 .75.75 0 01-.75.75h-2.5A2.75 2.75 0 012 12.25V3.5h-.25A.75.75 0 011 2.75zM4 8a1 1 0 112 0 1 1 0 01-2 0zm3 0a1 1 0 112 0 1 1 0 01-2 0zm3 0a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
        <Link href="/" className="text-xl font-bold text-forest">
          TrackFlow
        </Link>
        <span className="rounded-full bg-leaf/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-leaf">
          Backoffice
        </span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Navegación principal">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-forest text-white"
                  : "text-muted hover:bg-slate-100 hover:text-ink"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 px-4 py-4">
        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-forest text-xs font-bold text-white">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{user.email}</p>
            <p className="text-xs capitalize text-muted">{user.role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-slate-100 hover:text-red-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 3a7 7 0 00-4.95 11.95.75.75 0 101.06-1.06A5.5 5.5 0 1115.5 10H13a.75.75 0 000 1.5h4a.75.75 0 00.75-.75v-4a.75.75 0 00-1.5 0v1.09A7 7 0 0010 3z" />
          </svg>
          Recargar
        </button>
      </div>
    </aside>
  );
}

