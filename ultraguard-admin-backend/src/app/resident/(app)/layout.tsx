"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useResidentAuth } from "@/lib/resident-auth-context";

const NAV_ITEMS = [
  { href: "/resident/dashboard", label: "Dashboard" },
  { href: "/resident/invite", label: "Invite" },
  { href: "/resident/history", label: "History" },
  { href: "/resident/settings", label: "Settings" },
];

export default function ResidentAppLayout({ children }: { children: React.ReactNode }) {
  const { resident, loading, logout } = useResidentAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !resident) router.replace("/resident/login");
  }, [loading, resident, router]);

  if (loading || !resident) {
    return (
      <div className="ug-center-screen">
        <div className="ug-spinner" />
      </div>
    );
  }

  return (
    <>
      <header className="ug-res-topbar">
        <Image src="/ultraguard-logo.png" alt="Ultra-Guard" width={140} height={34} style={{ height: "auto" }} priority />
        <nav className="ug-res-topbar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`ug-res-nav-link ${pathname === item.href ? "ug-res-nav-link-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
          <button className="ug-btn ug-btn-secondary ug-btn-sm" onClick={logout}>
            Log Out
          </button>
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}
