import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getPrivateOverviewData,
  getPublicPerformanceData,
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

export default async function PrivateOverviewPage() {
  const [{ me, slots, ctas, canManageCouncil, announcements }, performance] = await Promise.all([
    getPrivateOverviewData(),
    getPublicPerformanceData(),
  ]);

  if (!me || !slots) {
    redirect("/");
  }

  const openCtas = (ctas ?? []).filter((cta) => cta.status !== "FINALIZED" && cta.status !== "CANCELED");
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
