import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getPrivateOverviewData,
  getPublicPerformanceData,
} from "../lib";
import { OverviewAnnouncements } from "./OverviewAnnouncements";
import { OverviewPlayerPerformanceCard } from "./OverviewPlayerPerformanceCard";

export default async function PrivateOverviewPage() {
  const [{ me, slots, ctas, canManageCouncil }, performance] = await Promise.all([
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
      <article className="dashboard-card">
        <div className="section-row">
          <div>
            <span className="card-label">Resumen</span>
            <h2>Bienvenido a The Hundred</h2>
          </div>
        </div>
      </article>

      <OverviewAnnouncements canEdit={canEditAnnouncements} />

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

      <article className="dashboard-card">
        <div className="section-row">
          <div>
            <span className="card-label">CTAs activas</span>
            <h2>Próximas CTAS</h2>
          </div>
          <Link className="button ghost compact" href="/app/ctas">
            Ver más
          </Link>
        </div>
        {openCtas.length > 0 ? (
          <div className="overview-cta-links">
            {openCtas.map((cta) => (
              <Link
                className="status-badge"
                href={`/app/ctas#cta-${cta.id}`}
                key={cta.id}
              >
                {cta.title} ·{" "}
                {new Date(cta.datetimeUtc).toLocaleDateString("es-ES")}
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty">No hay CTAs activas.</p>
        )}
      </article>
    </section>
  );
}
