import type { ReactNode } from "react";

import AuthGuard from "@/components/auth/AuthGuard";
import Sidebar from "@/components/Sidebar";

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 bg-paper">{children}</div>
      </div>
    </AuthGuard>
  );
}