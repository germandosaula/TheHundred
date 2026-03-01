import { redirect } from "next/navigation";
import { getPrivateDashboardData } from "../lib";

export default async function PrivateOverviewPage() {
  const { me, slots, ctas, members, hasPrivateAccess } = await getPrivateDashboardData();

  if (!me || !slots) {
    redirect("/");
  }

  return (
    <section className="dashboard-stack">
      <article className="dashboard-card">
        <div className="section-row">
          <div>
            <span className="card-label">Situacion actual</span>
            <h2>
              {hasPrivateAccess
                ? "La guild entra a pelear con estructura real."
                : "Tu acceso esta enlazado, pero aun no esta operativo del todo."}
            </h2>
          </div>
        </div>
        <p className="lede">
          {hasPrivateAccess
            ? "Este war room no existe para decorar. Aqui se refleja quien esta dentro, cuantas plazas quedan vivas y que contenido ya esta abierto para el roster aprobado."
            : "Tu cuenta ya esta dentro del entorno privado, pero todavia faltan datos operativos o sincronizacion final para abrir todas las vistas de guild."}
        </p>
      </article>
      <div className="dashboard-grid">
        <article className="dashboard-card metric-card">
          <span className="card-label">Huecos reales</span>
          <strong>
            {slots.slotsOpen}/{slots.memberCap}
          </strong>
          <p>{slots.memberCap - slots.slotsOpen} plazas ya estan ocupadas por miembros activos de guild.</p>
        </article>
        <article className="dashboard-card metric-card">
          <span className="card-label">CTAs visibles</span>
          <strong>{ctas?.length ?? "--"}</strong>
          <p>
            {ctas
              ? "Eventos ya visibles para miembros aprobados dentro de The Hundred."
              : "Las CTAs se abriran aqui cuando el acceso privado quede resuelto por completo."}
          </p>
        </article>
        <article className="dashboard-card metric-card">
          <span className="card-label">Roster conectado</span>
          <strong>{members?.length ?? "--"}</strong>
          <p>
            {members
              ? "Miembros sincronizados con la misma base operativa que usa el bot de Discord."
              : "Vista operacional reservada para officers y admins."}
          </p>
        </article>
      </div>
    </section>
  );
}
