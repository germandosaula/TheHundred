"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { MeData } from "../lib";

interface AppSidebarProps {
  me: MeData;
  canManageCouncil: boolean;
  isCouncil: boolean;
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

function LogoutIcon() {
  return (
    <svg aria-hidden="true" className="nav-icon" fill="none" viewBox="0 0 24 24">
      <path
        d="M10 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M15 12H3m0 0 3-3m-3 3 3 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function getGuildRoleLabel(role: MeData["role"], canManageCouncil: boolean, isCouncil: boolean) {
  if (isCouncil) {
    return "Staff";
  }

  if (canManageCouncil && role === "PLAYER") {
    return "Staff";
  }

  switch (role) {
    case "ADMIN":
      return "Admin";
    case "OFFICER":
      return "Oficial";
    default:
      return "Jugador";
  }
}

export function AppSidebar({ me, canManageCouncil, isCouncil, children }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const primaryItems = [
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
  const staffItems: Array<{ href: string; label: string; icon: string }> = [];
  if (canManageCouncil) {
    staffItems.push({
      href: "/app/scouting",
      label: "Scouting",
      icon: "M11 19a8 8 0 1 1 5.3-14l4.7 4.7m-2.1 7.4-3.7-3.7"
    });
  }
  if (isCouncil) {
    staffItems.push({
      href: "/app/council-tasks",
      label: "Tareas Council",
      icon: "M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01"
    });
    staffItems.push({
      href: "/app/embotelladas",
      label: "Embotelladas",
      icon: "M10 3h4v3h3v15H7V6h3V3Zm0 6h4m-4 4h4m-4 4h4"
    });
  }
  if (canManageCouncil) {
    staffItems.push({
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
                <span>{getGuildRoleLabel(me.role, canManageCouncil, isCouncil)}</span>
              </div>
            ) : null}
          </div>
          <button className="sidebar-toggle mobile-only" onClick={() => setSidebarOpen(false)} type="button">
            <ToggleSidebarIcon collapsed={false} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {primaryItems.map((item) => (
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
          {staffItems.length > 0 ? (
            <>
              {staffItems.map((item) => (
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
            </>
          ) : null}
        </nav>
        <div className={`sidebar-actions ${collapsed ? "collapsed" : ""}`}>
          <button className="button ghost sidebar-logout" disabled={loggingOut} onClick={handleLogout} type="button">
            {!collapsed ? (loggingOut ? "Cerrando..." : "Cerrar sesion") : <LogoutIcon />}
          </button>
        </div>
      </aside>

      <div className={`sidebar-backdrop ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} />

      <section className="app-main">
        <header className="app-topbar app-topbar-minimal">
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
