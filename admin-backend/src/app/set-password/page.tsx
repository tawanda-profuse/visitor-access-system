"use client";

import { Suspense } from "react";
import { SetPasswordForm } from "@/components/SetPasswordForm";

// The backend emails invite and forgot-password links pointing at
// `${BASE_URL}/set-password?token=...&role=admin` (see src/app/api/admins/route.ts and
// src/app/api/auth/admin/forgot-password/route.ts) for BOTH the admin invite flow and
// the forgot-password flow.
export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="ug-center-screen">
          <div className="ug-spinner" />
        </div>
      }
    >
      <SetPasswordForm />
    </Suspense>
  );
}
