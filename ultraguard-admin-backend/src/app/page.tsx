"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RootPage() {
  const { admin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(admin ? "/dashboard" : "/login");
  }, [loading, admin, router]);

  return (
    <div className="ug-center-screen">
      <div className="ug-spinner" />
    </div>
  );
}
