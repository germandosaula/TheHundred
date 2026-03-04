"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { MeData } from "../lib";

interface AppSidebarProps {
  me: MeData;
  children: React.ReactNode;
}

function SidebarIcon({ path }: { path: string }) {
  return (
    <svg aria-hidden="true" className="nav-icon" fill="none" viewBox="0 0 24 24">
      <path
        d={path}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ToggleSidebarIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg aria-hidden="true" className="sidebar-toggle-icon" fill="none" viewBox="0 0 24 24">
      {collapsed ? (
        <path
          d="m9 6 6 6-6 6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      ) : (
        <path
          d="m15 6-6 6 6 6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}

function getGuildRoleLabel(role: MeData["role"]) {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "OFFICER":
      return "Oficial";
    default:
      return "Jugador";
  }
}

export function AppSidebar({ me, children }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isOfficerOrAdmin = me.role === "OFFICER" || me.role === "ADMIN";
  const navItems = [
    {
      href: "/app",
      label: "Resumen",
      icon: "M4 12h16M4 6h16M4 18h10"
    },
    {
      href: "/app/ranking",
      label: "Ranking",
      icon: "M6 18V9m6 9V5m6 13v-7"
    },
    {
      href: "/app/ctas",
      label: "CTAs",
      icon: "M8 7h8M7 3h10l1 4H6l1-4Zm-1 7h12v10H6V10Z"
    },
    {
      href: "/app/battles",
      label: "Battles",
      icon: "m7 6 5 5m0 0 5-5m-5 5-5 7m5-7 5 7"
    },
    {
      href: "/app/rendimiento",
      label: "Rendimiento",
      icon: "M5 18h14M7 15V9m5 6V6m5 9v-3"
    },
    {
      href: "/app/comps",
      label: "Comps",
      icon: "M12 3 5 7v5c0 4.5 2.8 7.7 7 9 4.2-1.3 7-4.5 7-9V7l-7-4Z"
    }
  ];
  if (isOfficerOrAdmin) {
    navItems.push({
      href: "/app/members",
      label: "Miembros",
      icon: "M16 19a4 4 0 0 0-8 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a3 3 0 0 0-3-3m0-5a3 3 0 1 0-2.2-5"
    });
  }

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await fetch("/logout", {
        method: "POST"
      });
    } finally {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="app-shell">
      <aside className={`app-sidebar ${collapsed ? "collapsed" : ""} ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <button
            className="sidebar-toggle desktop-only"
            onClick={() => setCollapsed((value) => !value)}
            type="button"
          >
            <ToggleSidebarIcon collapsed={collapsed} />
          </button>
          <div className="sidebar-brand">
            {me.avatarUrl ? (
              <img alt={me.displayName} className="sidebar-logo user-avatar" height={46} src={me.avatarUrl} width={46} />
            ) : (
              <Image
                alt="The Hundred logo"
                className="sidebar-logo"
                height={46}
                priority
                src="/thehundred_logo.png"
                width={46}
              />
            )}
            {!collapsed ? (
              <div className="sidebar-brand-copy">
                <strong>{me.displayName}</strong>
                <span>{getGuildRoleLabel(me.role)}</span>
              </div>
            ) : null}
          </div>
          <button className="sidebar-toggle mobile-only" onClick={() => setSidebarOpen(false)} type="button">
            <ToggleSidebarIcon collapsed={false} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              className={pathname === item.href ? "active" : ""}
              href={item.href}
              key={item.href}
              onClick={() => setSidebarOpen(false)}
            >
              <SidebarIcon path={item.icon} />
              {!collapsed ? item.label : null}
            </Link>
          ))}
        </nav>
        <div className={`sidebar-actions ${collapsed ? "collapsed" : ""}`}>
          <button className="button ghost sidebar-logout" disabled={loggingOut} onClick={handleLogout} type="button">
            {!collapsed ? (loggingOut ? "Cerrando..." : "Cerrar sesion") : "x"}
          </button>
        </div>
      </aside>

      <div className={`sidebar-backdrop ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} />

      <section className="app-main">
        <header className="app-topbar">
          <div>
            <p className="eyebrow">The Hundred | War Room</p>
            <h1>Dashboard privado</h1>
            <p className="lede">
              Estado del roster, CTAs y acceso interno.
            </p>
          </div>
          <div className="topbar-actions">
            <button className="sidebar-toggle mobile-only" onClick={() => setSidebarOpen(true)} type="button">
              <ToggleSidebarIcon collapsed />
            </button>
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}
