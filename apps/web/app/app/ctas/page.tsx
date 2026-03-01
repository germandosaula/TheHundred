import { redirect } from "next/navigation";
import { getPrivateDashboardData } from "../../lib";
import { CtasLiveRefresh } from "./CtasLiveRefresh";
import { CtaBoard } from "./CtaBoard";

export default async function CtasPage() {
  const { me, ctas } = await getPrivateDashboardData();

  if (!me) {
    redirect("/");
  }

  const visibleCtas = ctas?.filter((cta) => cta.status !== "FINALIZED") ?? [];

  return (
    <section className="dashboard-stack ctas-page">
      <CtasLiveRefresh />
      <article className="dashboard-card ctas-hero-card">
        <div className="section-row">
          <div>
            <span className="card-label">CTAs</span>
            <h2>La agenda de guerra del roster.</h2>
          </div>
          <div className="actions">
            <span className="status-badge">{visibleCtas.length} activas</span>
          </div>
        </div>
        <p className="lede">
          Aqui entra el contenido que importa: llamadas activas, compos vinculadas y como va el
          signup real del roster para cada CTA abierta desde Discord. Esta vista se refresca sola
          para seguir el estado del bot.
        </p>
      </article>
      {!ctas ? (
        <article className="dashboard-card">
          <p className="empty">No se han podido cargar las CTAs ahora mismo.</p>
        </article>
      ) : visibleCtas.length > 0 ? (
        <div className="cta-board-list">
          {visibleCtas.map((cta) => (
            <CtaBoard cta={cta} key={cta.id} />
          ))}
        </div>
      ) : (
        <article className="dashboard-card">
          <p className="empty">Ahora mismo no hay CTAs abiertas en el war room.</p>
        </article>
      )}
    </section>
  );
}
