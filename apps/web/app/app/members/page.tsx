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
          El roster no se gestiona solo. Reject para que pierdan permisos
          temporales,kick para mandarlos a tomar por culo.
        </p>
        {!canManageCouncil ? (
          <p className="empty">
            Solo council, officers y admins pueden acceder a la gestion del
            roster.
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
