"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  DoorOpen,
  KeyRound,
  ScrollText,
  AlertTriangle,
  Settings,
  ShieldCheck,
  LogOut,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLiveConnectionStatus } from "@/lib/live-events-context";
import { isSuperAdmin } from "@/lib/roles";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/residents", label: "Residents", icon: Users },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/gates", label: "Gates", icon: DoorOpen },
  { href: "/access-codes", label: "Access Codes", icon: KeyRound },
  { href: "/entry-logs", label: "Entry Logs", icon: ScrollText },
  { href: "/panic-alerts", label: "Panic Alerts", icon: AlertTriangle },
];

const SUPER_ADMIN_NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admins", label: "Admins", icon: ShieldCheck },
];

const COLLAPSE_STORAGE_KEY = "ug_sidebar_collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const { admin, logout } = useAuth();
  const connected = useLiveConnectionStatus();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Read the persisted preference after mount only, so the server-rendered/first-paint
  // markup is deterministic and doesn't flash between the two states.
  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(collapsed));
  }, [collapsed, hydrated]);

  const allNavItems = [...NAV_ITEMS, ...(isSuperAdmin(admin) ? SUPER_ADMIN_NAV_ITEMS : [])];

  return (
    <>
    <aside className={`ug-sidebar ${collapsed ? "ug-sidebar-collapsed" : ""}`}>
      <div className="ug-sidebar-top">
        <div className="ug-sidebar-logo">
          {collapsed ? (
            <Image src="/logo-icon.png" alt="SecureGate" width={36} height={36} priority />
          ) : (
            <Image
              src="/logo.png"
              alt="SecureGate"
              width={180}
              height={44}
              style={{ height: "auto", width: "100%" }}
              priority
            />
          )}
        </div>
        <button
          type="button"
          className="ug-sidebar-toggle"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="ug-sidebar-nav">
        {allNavItems.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`ug-nav-link ${active ? "ug-nav-link-active" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} strokeWidth={2} className="ug-nav-icon" />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="ug-sidebar-footer">
        <div className="ug-live-indicator" title={connected ? "Receiving live updates" : "Live updates disconnected"}>
          <span className={`ug-live-dot ${connected ? "ug-live-dot-on" : ""}`} />
          {!collapsed ? <span>{connected ? "Live" : "Offline"}</span> : null}
        </div>

        {!collapsed ? (
          <>
            <div style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 600, marginTop: "0.6rem" }}>{admin?.name}</div>
            <div style={{ color: "#9a9a9a", fontSize: "0.75rem", marginBottom: "0.75rem" }}>{admin?.role}</div>
          </>
        ) : (
          <div style={{ height: "0.6rem" }} />
        )}

        <Link
          href="/profile"
          className={`ug-nav-link ${pathname === "/profile" ? "ug-nav-link-active" : ""}`}
          title={collapsed ? "Profile Settings" : undefined}
          style={{ marginBottom: "0.3rem" }}
        >
          <Settings size={18} strokeWidth={2} className="ug-nav-icon" />
          {!collapsed ? <span>Profile Settings</span> : null}
        </Link>

        <a
          href="mailto:tawandamsengezi@gmail.com"
          className="ug-nav-link"
          style={{ color: "var(--ug-red)", marginBottom: "0.3rem" }}
          title={collapsed ? "Contact Tech Support" : undefined}
        >
          <Mail size={18} strokeWidth={2} className="ug-nav-icon" />
          {!collapsed ? <span>Contact Tech Support</span> : null}
        </a>

        <button
          className="ug-btn ug-btn-secondary ug-btn-sm ug-logout-btn"
          style={{ width: "100%" }}
          onClick={logout}
          title={collapsed ? "Log out" : undefined}
        >
          <LogOut size={16} />
          {!collapsed ? <span>Log out</span> : null}
        </button>
      </div>
    </aside>

    <nav className="ug-bottom-nav">
      {allNavItems.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className={`ug-bottom-nav-link ${active ? "ug-bottom-nav-link-active" : ""}`}>
            <Icon size={20} strokeWidth={2} />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <Link href="/profile" className={`ug-bottom-nav-link ${pathname === "/profile" ? "ug-bottom-nav-link-active" : ""}`}>
        <Settings size={20} strokeWidth={2} />
        <span>Settings</span>
      </Link>
      <a href="mailto:tawandamsengezi@gmail.com" className="ug-bottom-nav-link" style={{ color: "var(--ug-red)" }}>
        <Mail size={20} strokeWidth={2} />
        <span>Support</span>
      </a>
      <button className="ug-bottom-nav-link" onClick={logout}>
        <LogOut size={20} strokeWidth={2} />
        <span>Log Out</span>
      </button>
    </nav>
    </>
  );
}
