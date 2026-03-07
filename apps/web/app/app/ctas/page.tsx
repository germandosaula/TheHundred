import { redirect } from "next/navigation";
import { getPrivateCtasData } from "../../lib";
import { CtasLiveRefresh } from "./CtasLiveRefresh";
import { CtaBoard } from "./CtaBoard";

export default async function CtasPage() {
  const { me, ctas, assignablePlayers, builds, canEditCompsAndCtas, canCancelCta } =
    await getPrivateCtasData();

  if (!me) {
    redirect("/");
  }
  const canEdit = canEditCompsAndCtas;

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
      </article>
      {!ctas ? (
        <article className="dashboard-card">
          <p className="empty">No se han podido cargar las CTAs ahora mismo.</p>
        </article>
      ) : visibleCtas.length > 0 ? (
        <div className="cta-board-list">
          {visibleCtas.map((cta) => (
            <CtaBoard
              assignablePlayers={assignablePlayers}
              builds={builds}
              canCancel={canCancelCta}
              canEdit={canEdit}
              cta={cta}
              key={cta.id}
            />
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
