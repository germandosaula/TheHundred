import { redirect } from "next/navigation";
import { getPrivateBottledEnergyData } from "../../lib";
import { EmbotelladasBoard } from "./EmbotelladasBoard";

export default async function EmbotelladasPage() {
  const { me, data, canAccess } = await getPrivateBottledEnergyData();

  if (!me) {
    redirect("/");
  }
  if (!canAccess || !data) {
    redirect("/app");
  }

  return (
    <section className="dashboard-stack">
      <article className="dashboard-card">
        <div className="section-row">
          <div>
            <span className="card-label">Staff</span>
            <h2>Embotelladas</h2>
          </div>
        </div>
        <p className="lede">
          Pega el historial del juego exacto para actualizar balances.
        </p>
        <EmbotelladasBoard initialData={data} />
      </article>
    </section>
  );
}
