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

export function AppSidebar({ me, children }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isOfficerOrAdmin = me.role === "OFFICER" || me.role === "ADMIN";
  const navItems = [
    { href: "/app", label: "Resumen" },
    { href: "/app/ranking", label: "Ranking" },
    { href: "/app/ctas", label: "CTAs" },
    { href: "/app/battles", label: "Battles" },
    { href: "/app/comps", label: "Comps" }
  ];
  if (isOfficerOrAdmin) {
    navItems.splice(4, 0, { href: "/app/members", label: "Miembros" });
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
            {collapsed ? ">>" : "<<"}
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
                <strong>The Hundred</strong>
                <span>War room</span>
              </div>
            ) : null}
          </div>
          <button className="sidebar-toggle mobile-only" onClick={() => setSidebarOpen(false)} type="button">
            x
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
              <span className="nav-dot" />
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
              Menu
            </button>
            <Link className="button ghost" href="/">
              Volver a Public
            </Link>
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}
