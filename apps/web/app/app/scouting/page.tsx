import { redirect } from "next/navigation";
import { getPrivateScoutingData } from "../../lib";
import { AlbionScoutingLookup } from "../../AlbionScoutingLookup";

export default async function ScoutingPage() {
  const { me, canManageCouncil } = await getPrivateScoutingData();

  if (!me) {
    redirect("/");
  }
  if (!canManageCouncil) {
    redirect("/app");
  }

  return (
    <section className="dashboard-stack">
      <article className="dashboard-card">
        <div className="section-row">
          <div>
            <span className="card-label">Scouting</span>
            <h2>Lookup de jugadores de Albion.</h2>
          </div>
        </div>
        <p className="lede">
          Busca por nombre de Albion Online y revisa Kill Fame, Death Fame y KD Fame.
        </p>
        <AlbionScoutingLookup />
      </article>
    </section>
  );
}
