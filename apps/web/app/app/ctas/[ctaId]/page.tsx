import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrivateCtasData } from "../../../lib";
import { CtasLiveRefresh } from "../CtasLiveRefresh";
import { CtaBoard } from "../CtaBoard";
import { CtaFinalizeButton } from "../CtaFinalizeButton";

interface CtaDetailPageProps {
  params: Promise<{ ctaId: string }>;
}

export default async function CtaDetailPage({ params }: CtaDetailPageProps) {
  const { ctaId } = await params;
  const {
    me,
    ctas,
    comps,
    assignablePlayers,
    builds,
    canEditCompsAndCtas,
    canCancelCta,
  } = await getPrivateCtasData();

  if (!me) {
    redirect("/");
  }

  const cta = (ctas ?? []).find((entry) => entry.id === ctaId);
  if (!cta || cta.status === "FINALIZED" || cta.status === "CANCELED") {
    return (
      <section className="dashboard-stack ctas-page">
        <article className="dashboard-card">
          <div className="section-row">
            <div>
              <span className="card-label">CTAs</span>
              <h2>CTA no disponible</h2>
            </div>
            <Link className="button ghost compact" href="/app/ctas">
              Volver a CTAs
            </Link>
          </div>
          <p className="empty">La CTA no existe o ya fue cerrada.</p>
        </article>
      </section>
    );
  }

  return (
    <section className="dashboard-stack ctas-page">
      <CtasLiveRefresh />
      <article className="dashboard-card ctas-hero-card">
        <div className="section-row">
          <div>
            <span className="card-label">CTA</span>
            <h2>Detalles CTA</h2>
          </div>
          <div className="actions">
            {canEditCompsAndCtas && cta.status === "OPEN" ? <CtaFinalizeButton ctaId={cta.id} /> : null}
            <Link className="button ghost compact" href="/app/ctas">
              Volver a CTAs
            </Link>
          </div>
        </div>
      </article>
      <CtaBoard
        assignablePlayers={assignablePlayers}
        builds={builds}
        canCancel={canCancelCta}
        canEdit={canEditCompsAndCtas}
        comps={comps}
        currentUserId={me.id}
        cta={cta}
      />
    </section>
  );
}
