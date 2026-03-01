import { redirect } from "next/navigation";
import { MemberStatusManager } from "../../MemberStatusManager";
import { getPrivateDashboardData } from "../../lib";

export default async function MembersPage() {
  const { me, members } = await getPrivateDashboardData();

  if (!me) {
    redirect("/");
  }

  const canManageMembers = me.role === "OFFICER" || me.role === "ADMIN";

  return (
    <section className="dashboard-stack">
      <article className="dashboard-card">
        <div className="section-row">
          <div>
            <span className="card-label">Miembros</span>
            <h2>Quien entra, quien rota y quien se queda fuera.</h2>
          </div>
        </div>
        <p className="lede">
          El roster no se gestiona solo. Aqui officers y admins deciden el estado real de cada jugador
          dentro de la estructura de guild.
        </p>
        {!canManageMembers ? (
          <p className="empty">Solo officers y admins pueden acceder a la gestion del roster.</p>
        ) : members ? (
          <MemberStatusManager members={members} />
        ) : (
          <p className="empty">No se han podido cargar los miembros del roster.</p>
        )}
      </article>
    </section>
  );
}
