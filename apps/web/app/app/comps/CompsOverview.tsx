import Link from "next/link";
import type { CompEntry } from "../../lib";

interface CompsOverviewProps {
  canEdit: boolean;
  comps: CompEntry[];
}

function summarizeRoles(comp: CompEntry) {
  const counts = new Map<string, number>();

  for (const party of comp.parties) {
    for (const slot of party.slots) {
      counts.set(slot.role, (counts.get(slot.role) ?? 0) + 1);
    }
  }

  return [...counts.entries()];
}

function countSlots(comp: CompEntry) {
  return comp.parties.reduce((total, party) => total + party.slots.length, 0);
}

export function CompsOverview({ canEdit, comps }: CompsOverviewProps) {
  return (
    <section className="dashboard-stack">
      <article className="dashboard-card">
        <div className="section-row">
          <div>
            <span className="card-label">War Compositions</span>
            <h2>Comps de The Hundred</h2>
          </div>
          {canEdit ? (
            <Link className="button primary" href="/app/comps/new">
              Nueva comp
            </Link>
          ) : (
            <span className="status-badge">Solo consulta</span>
          )}
        </div>
      </article>

      <div className="comps-overview-list">
        {comps.length > 0 ? (
          comps.map((comp) => (
            <article className="dashboard-card comps-overview-card" key={comp.id}>
              <div className="section-row">
                <div>
                  <span className="card-label">Comp</span>
                  <h2>{comp.name}</h2>
                </div>
                <div className="actions">
                  <span className="status-badge">
                    {comp.parties.length} {comp.parties.length === 1 ? "party" : "parties"} · {countSlots(comp)} slots
                  </span>
                  <Link className="button ghost" href={`/app/comps/new?comp=${comp.id}`}>
                    {canEdit ? "Editar" : "Ver"}
                  </Link>
                </div>
              </div>
              <div className="comp-summary compact">
                {summarizeRoles(comp).map(([role, count]) => (
                  <div className={`comp-summary-chip role-${role.toLowerCase().replace(/\s+/g, "-")}`} key={role}>
                    <strong>{count}</strong>
                    <span>{role}</span>
                  </div>
                ))}
              </div>
            </article>
          ))
        ) : (
          <article className="dashboard-card">
            <span className="card-label">Comps</span>
            <h2>Aun no hay comps creadas.</h2>
            <p className="empty">Cuando council o admins publiquen una comp, aparecera aqui.</p>
            {canEdit ? (
              <Link className="button primary" href="/app/comps/new">
                Crear primera comp
              </Link>
            ) : null}
          </article>
        )}
      </div>
    </section>
  );
}
