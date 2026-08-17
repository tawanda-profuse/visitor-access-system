"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LiveEventsProvider } from "@/lib/live-events-context";
import { Sidebar } from "@/components/Sidebar";
import { needsOnboarding } from "@/lib/roles";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!admin) {
      router.replace("/login");
    } else if (needsOnboarding(admin)) {
      // A Property Admin who hasn't finished the onboarding wizard can't use any other
      // portal page yet — force them there even on a direct URL to e.g. /gates.
      router.replace("/onboarding");
    }
  }, [loading, admin, router]);

  if (loading || !admin || needsOnboarding(admin)) {
    return (
      <div className="ug-center-screen">
        <div className="ug-spinner" />
      </div>
    );
  }

  return (
    <LiveEventsProvider>
      <div className="ug-app-shell">
        <Sidebar />
        <main className="ug-main">
          <div className="ug-content">{children}</div>
        </main>
      </div>
    </LiveEventsProvider>
  );
}
