"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UserPlus,
  History,
  ScanLine,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { useResidentAuth } from "@/lib/resident-auth-context";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/resident/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/resident/invite", label: "Invite", icon: UserPlus },
  { href: "/resident/history", label: "History", icon: History },
  { href: "/resident/guard", label: "Guard", icon: ScanLine },
  { href: "/resident/settings", label: "Settings", icon: Settings },
];

const COLLAPSE_STORAGE_KEY = "ug_resident_sidebar_collapsed";

export default function ResidentAppLayout({ children }: { children: React.ReactNode }) {
  const { resident, loading, logout } = useResidentAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!loading && !resident) router.replace("/resident/login");
  }, [loading, resident, router]);

  // Read the persisted preference after mount only, so the server-rendered/first-paint
  // markup is deterministic and doesn't flash between the two states.
  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(collapsed));
  }, [collapsed, hydrated]);

  if (loading || !resident) {
    return (
      <div className="ug-center-screen">
        <div className="ug-spinner" />
      </div>
    );
  }

  return (
    <div className="ug-res-shell">
      <aside className={`ug-res-sidebar ${collapsed ? "ug-res-sidebar-collapsed" : ""}`}>
        <div className="ug-res-sidebar-top">
          <div className="ug-res-sidebar-logo">
            {collapsed ? (
              <Image src="/logo-icon.png" alt="SecureGate" width={32} height={32} priority />
            ) : (
              <Image
                src="/logo.png"
                alt="SecureGate"
                width={160}
                height={39}
                style={{ height: "auto", width: "100%" }}
                priority
              />
            )}
          </div>
          <button
            type="button"
            className="ug-res-sidebar-toggle"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="ug-res-sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ug-res-nav-link ${active ? "ug-res-nav-link-active" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} strokeWidth={2} />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="ug-res-sidebar-footer">
          {!collapsed ? (
            <div style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 600 }}>{resident.name}</div>
          ) : null}
          <button
            className="ug-btn ug-btn-secondary ug-btn-sm"
            onClick={logout}
            title={collapsed ? "Log out" : undefined}
          >
            <LogOut size={16} style={{ marginRight: collapsed ? 0 : 6 }} />
            {!collapsed ? "Log Out" : null}
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
