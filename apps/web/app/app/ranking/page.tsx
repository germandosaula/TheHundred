import { redirect } from "next/navigation";
import Link from "next/link";
import { getPrivateRankingData } from "../../lib";
import { RankingAttendanceList } from "../../RankingAttendanceList";

interface RankingPageProps {
  searchParams: Promise<{
    month?: string;
  }>;
}

export default async function RankingPage({ searchParams }: RankingPageProps) {
  const params = await searchParams;
  const month = params.month?.trim();
  const { me, ranking } = await getPrivateRankingData(month);

  if (!me) {
    redirect("/");
  }

  return (
    <section className="dashboard-stack">
      <article className="dashboard-card">
        <div className="section-row">
          <div>
            <span className="card-label">Ranking</span>
            <h2>Ranking de The Hundred</h2>
          </div>
        </div>
        <p className="lede">
          Compite en el ranking de asistencia y gana premios cada mes
        </p>
        {!ranking ? (
          <p className="empty">No hay datos.</p>
        ) : ranking.entries.length > 0 ? (
          <>
            <div className="ranking-month-tabs">
              <Link
                className="button ghost"
                href={
                  ranking.pagination.previousMonth
                    ? `/app/ranking?month=${ranking.pagination.previousMonth}`
                    : "/app/ranking"
                }
              >
                Mes anterior
              </Link>
              <span className="status-badge">{ranking.selectedMonthLabel}</span>
              <Link
                className="button ghost"
                href={
                  ranking.pagination.nextMonth
                    ? `/app/ranking?month=${ranking.pagination.nextMonth}`
                    : "/app/ranking"
                }
              >
                Mes siguiente
              </Link>
            </div>
            <RankingAttendanceList ranking={ranking.entries} />
          </>
        ) : (
          <>
            <div className="ranking-month-tabs">
              <Link
                className="button ghost"
                href={
                  ranking.pagination.previousMonth
                    ? `/app/ranking?month=${ranking.pagination.previousMonth}`
                    : "/app/ranking"
                }
              >
                Mes anterior
              </Link>
              <span className="status-badge">{ranking.selectedMonthLabel}</span>
              <Link
                className="button ghost"
                href={
                  ranking.pagination.nextMonth
                    ? `/app/ranking?month=${ranking.pagination.nextMonth}`
                    : "/app/ranking"
                }
              >
                Mes siguiente
              </Link>
            </div>
            <p className="empty">
              Todavia no hay registros suficientes para medir rendimiento del
              roster.
            </p>
          </>
        )}
      </article>
    </section>
  );
}
