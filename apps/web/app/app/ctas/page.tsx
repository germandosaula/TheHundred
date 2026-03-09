import { redirect } from "next/navigation";
import Link from "next/link";
import { getPrivateCtasData } from "../../lib";
import { CtasLiveRefresh } from "./CtasLiveRefresh";
import { CtaCreatePanel } from "./CtaCreatePanel";

export default async function CtasPage() {
  const { me, ctas, comps, canEditCompsAndCtas } = await getPrivateCtasData();

  if (!me) {
    redirect("/");
  }

  const visibleCtas = ctas?.filter((cta) => cta.status !== "FINALIZED" && cta.status !== "CANCELED") ?? [];

  return (
    <section className="dashboard-stack ctas-page">
      <CtasLiveRefresh />
      <article className="dashboard-card ctas-hero-card">
        <div className="section-row">
          <div>
            <span className="card-label">CTAs</span>
            <h2>CTAs de hoy</h2>
          </div>
          <div className="actions">
            <span className="status-badge">{visibleCtas.length} activas</span>
          </div>
        </div>
        {canEditCompsAndCtas ? <CtaCreatePanel comps={comps} /> : null}
      </article>
      {!ctas ? (
        <article className="dashboard-card">
          <p className="empty">No se han podido cargar las CTAs ahora mismo.</p>
        </article>
      ) : visibleCtas.length > 0 ? (
        <div className="cta-index-list">
          {visibleCtas.map((cta) => (
            <article className="dashboard-card cta-index-card" key={cta.id}>
              <div className="cta-index-copy">
                <span className="card-label">CTA</span>
                <h3>{cta.title}</h3>
                <p>
                  {new Date(cta.datetimeUtc).toLocaleString("es-ES", { timeZone: "UTC" })} UTC
                </p>
                {cta.compName ? <span className="status-badge">{cta.compName}</span> : null}
              </div>
              <div className="cta-index-meta">
                <span className={`status-badge cta-status ${cta.status.toLowerCase()}`}>{cta.status}</span>
                <Link className="button ghost compact" href={`/app/ctas/${cta.id}`}>
                  Entrar CTA
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <article className="dashboard-card">
          <p className="empty">Aún no hay ping disponible.</p>
        </article>
      )}
    </section>
  );
}
