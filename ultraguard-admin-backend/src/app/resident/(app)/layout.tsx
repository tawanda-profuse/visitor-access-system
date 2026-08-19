"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, UserPlus, History, ScanLine, Settings, LogOut, type LucideIcon } from "lucide-react";
import { useResidentAuth } from "@/lib/resident-auth-context";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/resident/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resident/invite", label: "Invite", icon: UserPlus },
  { href: "/resident/history", label: "History", icon: History },
  { href: "/resident/guard", label: "Guard", icon: ScanLine },
  { href: "/resident/settings", label: "Settings", icon: Settings },
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
    <div className="ug-res-shell">
      <aside className="ug-res-sidebar">
        <div className="ug-res-sidebar-logo">
          <Image src="/ultraguard-logo.png" alt="Ultra-Guard" width={160} height={39} style={{ height: "auto", width: "100%" }} priority />
        </div>

        <nav className="ug-res-sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`ug-res-nav-link ${active ? "ug-res-nav-link-active" : ""}`}>
                <Icon size={18} strokeWidth={2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ug-res-sidebar-footer">
          <div style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 600 }}>{resident.name}</div>
          <button className="ug-btn ug-btn-secondary ug-btn-sm" onClick={logout}>
            <LogOut size={16} style={{ marginRight: 6 }} />
            Log Out
          </button>
        </div>
      </aside>

      <div className="ug-res-main">{children}</div>

      <nav className="ug-res-bottom-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`ug-res-bottom-nav-link ${active ? "ug-res-bottom-nav-link-active" : ""}`}>
              <Icon size={20} strokeWidth={2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
