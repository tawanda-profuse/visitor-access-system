"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useResidentAuth } from "@/lib/resident-auth-context";

export default function RootPage() {
  const { admin, loading: adminLoading } = useAuth();
  const { resident, loading: residentLoading } = useResidentAuth();
  const router = useRouter();

  useEffect(() => {
    if (adminLoading || residentLoading) return;
    if (admin) {
      router.replace("/dashboard");
    } else if (resident) {
      router.replace("/resident/dashboard");
    } else {
      router.replace("/login");
    }
  }, [adminLoading, residentLoading, admin, resident, router]);

  return (
    <div className="ug-center-screen">
      <div className="ug-spinner" />
    </div>
  );
}
