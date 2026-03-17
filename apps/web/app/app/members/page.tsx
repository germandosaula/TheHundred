import { redirect } from "next/navigation";
import { MemberStatusManager } from "../../MemberStatusManager";
import { getPrivateMembersData } from "../../lib";

export default async function MembersPage() {
  const { me, members, canManageCouncil } = await getPrivateMembersData();

  if (!me) {
    redirect("/");
  }

  return (
    <section className="dashboard-stack">
      <article className="dashboard-card">
        <div className="section-row">
          <div>
            <span className="card-label">Miembros</span>
            <h2>Panel de gestión de miembros</h2>
          </div>
        </div>
        <p className="lede">
          Revisa el roster real, corrige nombres de Albion, organiza bombs y abre seguimientos
          cuando alguien entra en riesgo o cae en inactividad. Todo ocurre aquí, sin salir del
          panel de miembros.
        </p>
        {!canManageCouncil ? (
          <p className="empty">
            Solo Staff puede acceder a la gestión del roster y al seguimiento de actividad.
          </p>
        ) : members ? (
          <MemberStatusManager members={members} />
        ) : (
          <p className="empty">
            No se han podido cargar los miembros del roster.
          </p>
        )}
      </article>
    </section>
  );
}
