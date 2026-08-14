"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/Sidebar";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !admin) {
      router.replace("/login");
    }
  }, [loading, admin, router]);

  if (loading || !admin) {
    return (
      <div className="ug-center-screen">
        <div className="ug-spinner" />
      </div>
    );
  }

  return (
    <div className="ug-app-shell">
      <Sidebar />
      <main className="ug-main">
        <div className="ug-content">{children}</div>
      </main>
    </div>
  );
}
