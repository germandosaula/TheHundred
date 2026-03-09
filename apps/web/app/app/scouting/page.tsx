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
            <h2>El ojo espia</h2>
          </div>
        </div>
        <p className="lede">
          Busca por nombre de Albion y revisa métricas agregadas: kills, deaths, KD, damage,
          attendance, IP y fame.
        </p>
        <AlbionScoutingLookup />
      </article>
    </section>
  );
}
