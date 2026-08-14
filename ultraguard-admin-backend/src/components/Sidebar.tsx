"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/residents", label: "Residents" },
  { href: "/properties", label: "Properties" },
  { href: "/gates", label: "Gates" },
  { href: "/access-codes", label: "Access Codes" },
  { href: "/entry-logs", label: "Entry Logs" },
  { href: "/panic-alerts", label: "Panic Alerts" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { admin, logout } = useAuth();

  return (
    <aside className="ug-sidebar">
      <div className="ug-sidebar-logo">
        <Image src="/ultraguard-logo.png" alt="Ultra-Guard" width={180} height={44} style={{ height: "auto", width: "100%" }} priority />
      </div>
      <nav className="ug-sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`ug-nav-link ${active ? "ug-nav-link-active" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="ug-sidebar-footer">
        <div style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.15rem" }}>
          {admin?.name}
        </div>
        <div style={{ color: "#9a9a9a", fontSize: "0.75rem", marginBottom: "0.75rem" }}>{admin?.role}</div>
        <button className="ug-btn ug-btn-secondary ug-btn-sm" style={{ width: "100%" }} onClick={logout}>
          Log out
        </button>
      </div>
    </aside>
  );
}
