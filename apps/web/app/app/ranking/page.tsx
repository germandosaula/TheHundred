import { redirect } from "next/navigation";
import { getPrivateDashboardData } from "../../lib";

export default async function RankingPage() {
  const { me, ranking } = await getPrivateDashboardData();

  if (!me) {
    redirect("/");
  }

  return (
    <section className="dashboard-stack">
      <article className="dashboard-card">
        <div className="section-row">
          <div>
            <span className="card-label">Ranking</span>
            <h2>Quien esta sumando de verdad.</h2>
          </div>
        </div>
        <p className="lede">
          Puntos y constancia del roster que responde cuando toca CTA. Sin maquillaje y sin ruido.
        </p>
        <div className="table-like">
          {!ranking ? (
            <p className="empty">
              No se ha podido cargar el ranking ahora mismo.
            </p>
          ) : ranking.length > 0 ? (
            ranking.map((entry, index) => (
              <div className="table-row" key={entry.memberId}>
                <span>#{String(index + 1).padStart(2, "0")}</span>
                <strong>{entry.memberId}</strong>
                <span>{entry.points} pts</span>
              </div>
            ))
          ) : (
            <p className="empty">Todavia no hay registros suficientes para medir rendimiento del roster.</p>
          )}
        </div>
      </article>
    </section>
  );
}
