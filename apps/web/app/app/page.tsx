import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getPrivateOverviewData,
  getPublicPerformanceData,
  getPublicScheduledEventsData,
} from "../lib";
import { OverviewAnnouncements } from "./OverviewAnnouncements";
import { OverviewPlayerPerformanceCard } from "./OverviewPlayerPerformanceCard";

function getCtaTimeColorClass(datetimeUtc: string) {
  const hour = new Date(datetimeUtc).getUTCHours();
  if (hour >= 14 && hour <= 15) {
    return "cta-time-yellow";
  }
  if (hour >= 16 && hour <= 17) {
    return "cta-time-orange";
  }
  if (hour >= 18 && hour <= 19) {
    return "cta-time-red";
  }
  if (hour >= 20 && hour <= 21) {
    return "cta-time-purple";
  }
  if (hour >= 22 && hour <= 23) {
    return "cta-time-white";
  }
  return "cta-time-default";
}

function formatEventRemaining(targetUtc: string): string {
  const diffMs = new Date(targetUtc).getTime() - Date.now();
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return "Ahora";
  }

  const totalMinutes = Math.ceil(diffMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `en ${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `en ${hours}h ${minutes}m`;
  }
  return `en ${minutes}m`;
}

export default async function PrivateOverviewPage() {
  const [{ me, slots, ctas, canManageCouncil, announcements }, performance, events] = await Promise.all([
    getPrivateOverviewData(),
    getPublicPerformanceData(),
    getPublicScheduledEventsData(),
  ]);

  if (!me || !slots) {
    redirect("/");
  }

  const openCtas = (ctas ?? []).filter((cta) => cta.status !== "FINALIZED" && cta.status !== "CANCELED");
  const upcomingEvents = (events ?? [])
    .filter((event) => Date.parse(event.targetUtc) > Date.now())
    .sort((left, right) => Date.parse(left.targetUtc) - Date.parse(right.targetUtc))
    .slice(0, 8);
  const occupiedSlots = Math.max(0, slots.memberCap - slots.slotsOpen);
  const canEditAnnouncements = canManageCouncil;

  return (
    <section className="dashboard-stack">
      <div className="overview-layout">
        <div className="overview-main">
          <article className="dashboard-card overview-welcome-card">
            <img alt="" aria-hidden className="overview-welcome-bg-logo" src="/thehundred_logo.png" />
            <div className="section-row">
              <div>
                <span className="card-label">Resumen</span>
                <h2>Bienvenido a The Hundred</h2>
              </div>
            </div>
          </article>

          <OverviewAnnouncements
            canEdit={canEditAnnouncements}
            initialAnnouncements={announcements}
          />

          <div className="dashboard-grid overview-grid">
            <article className="dashboard-card metric-card">
              <span className="card-label">Slots disponibles</span>
              <strong>
                {slots.slotsOpen}/{slots.memberCap}
              </strong>
              <p>{occupiedSlots} ocupados en roster activo.</p>
            </article>

            <article className="dashboard-card metric-card">
              <span className="card-label">Rendimiento</span>
              <strong>
                {Math.round(performance?.attendance.averagePercent ?? 0)}%
              </strong>
              <p>
                Attendance medio · Main{" "}
                {Math.round(performance?.main.sharePercent ?? 0)}% · Bomb{" "}
                {Math.round(performance?.bombTotals.sharePercent ?? 0)}%.
              </p>
            </article>

            <OverviewPlayerPerformanceCard albionName={me.albionName} displayName={me.displayName} />
          </div>

          <article className="dashboard-card overview-events-shell">
            <div className="section-row">
              <div>
                <span className="card-label">Events activos</span>
                <h2>Resumen Events</h2>
              </div>
            </div>
            {upcomingEvents.length > 0 ? (
              <div className="overview-events-list">
                {upcomingEvents.map((event) => (
                  <article className="overview-event-item" key={event.id}>
                    <span className="overview-event-remaining">{formatEventRemaining(event.targetUtc)}</span>
                    <span className="overview-event-utc">
                      {new Date(event.targetUtc).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                        timeZone: "UTC"
                      })}{" "}
                      UTC
                    </span>
                    <span className="overview-event-creator">@{event.createdByDisplayName}</span>
                    <strong>{event.mapName}</strong>
                    <span>{event.description}</span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty">No hay events activos.</p>
            )}
          </article>
        </div>

        <aside className="overview-right">
          <article className="dashboard-card overview-cta-shell">
            <div className="section-row">
              <div>
                <span className="card-label">CTAs activas</span>
                <h2>Agenda CTA</h2>
              </div>
            </div>
            {openCtas.length > 0 ? (
              <div className="overview-cta-sidebar">
                {openCtas.map((cta) => (
                  <Link className={`overview-cta-item ${getCtaTimeColorClass(cta.datetimeUtc)}`} href={`/app/ctas/${cta.id}`} key={cta.id}>
                    <strong>{cta.title}</strong>
                    <span>{cta.compName ? `Comp: ${cta.compName}` : "Sin composición vinculada"}</span>
                    <span className="overview-cta-time">
                      {new Date(cta.datetimeUtc).toLocaleString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                        timeZone: "UTC"
                      })}{" "}
                      UTC
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="empty">No hay CTAs activas.</p>
            )}
          </article>

        </aside>
      </div>
    </section>
  );
}
