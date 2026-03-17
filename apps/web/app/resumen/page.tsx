import Link from "next/link";
import { getPublicScheduledEventsData } from "../lib";

function formatRemaining(targetUtc: string): string {
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

function formatUtcTime(targetUtc: string): string {
  return new Date(targetUtc).toLocaleTimeString("es-ES", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }) + " UTC";
}

export default async function ResumenPage() {
  const events = (await getPublicScheduledEventsData()) ?? [];

  return (
    <main className="resumen-page-shell">
      <section className="resumen-card">
        <div className="resumen-card-head">
          <div>
            <p className="eyebrow">The Hundred</p>
            <h1>Resumen de Eventos</h1>
          </div>
          <Link className="button ghost compact" href="/">
            Volver
          </Link>
        </div>

        {events.length === 0 ? (
          <p className="resumen-empty">No hay eventos activos ahora mismo.</p>
        ) : (
          <div className="resumen-events-list" role="table" aria-label="Eventos activos">
            {events.map((event) => (
              <article className="resumen-event-row" key={event.id} role="row">
                <span className="resumen-remaining" role="cell">{formatRemaining(event.targetUtc)}</span>
                <span className="resumen-utc" role="cell">{formatUtcTime(event.targetUtc)}</span>
                <span className="resumen-creator" role="cell">@{event.createdByDisplayName}</span>
                <span className="resumen-map" role="cell">{event.mapName}</span>
                <span className="resumen-description" role="cell">{event.description}</span>
              </article>
            ))}
          </div>
        )}

        <p className="resumen-note">Las horas se muestran en UTC y se ordenan por cuanto queda.</p>
      </section>
    </main>
  );
}
