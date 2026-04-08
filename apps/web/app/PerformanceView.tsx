import { Fragment } from "react";
import { PerformanceAttendanceSection } from "./PerformanceAttendanceSection";
import { PerformanceMemberWeaponsPanel } from "./PerformanceMemberWeaponsPanel";
import type { PublicPerformanceData } from "./lib";

function formatCompact(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${formatCompact(value)}%`;
}

export function PerformanceView({
  performance,
}: {
  performance: PublicPerformanceData | null;
}) {
  return (
    <section className="dashboard-stack">
      <article className="dashboard-card">
        <div className="section-row">
          <div>
            <span className="card-label">Rendimiento</span>
            <h2>Indicadores de rendimiento de The Hundred</h2>
          </div>
          {performance ? (
            <div className="actions">
              <span className="status-badge">
                {performance.trackedBattles} battles
              </span>
              {performance.lastUpdatedAt ? (
                <span className="status-badge">
                  Actualizado{" "}
                  {new Date(performance.lastUpdatedAt).toLocaleString("es-ES")}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <p className="lede">
          Acumulación de Battles de la guild para medir rendimiento de partys y
          attendance general.
        </p>
      </article>

      {!performance ? (
        <article className="dashboard-card">
          <p className="empty">
            No se ha podido cargar el rendimiento ahora mismo.
          </p>
        </article>
      ) : (
        <>
          <div className="dashboard-grid">
            <article className="dashboard-card metric-card">
              <span className="card-label">Attendance medio</span>
              <strong>
                {formatCompact(performance.attendance.averageCount)}
              </strong>
              <p>
                {formatPercent(performance.attendance.averagePercent)} sobre
                miembros totales en {performance.attendance.ctaCount} battles.
              </p>
            </article>
            <article className="dashboard-card metric-card">
              <span className="card-label">Main Kills media</span>
              <strong>{formatCompact(performance.main.averageKills)}</strong>
              <p>
                {formatPercent(performance.main.sharePercent)} del total de
                kills guardadas.
              </p>
            </article>
            <article className="dashboard-card metric-card">
              <span className="card-label">Bomb Kills media</span>
              <strong>
                {formatCompact(performance.bombTotals.averageKills)}
              </strong>
              <p>
                {formatPercent(performance.bombTotals.sharePercent)} del total
                de kills guardadas.
              </p>
            </article>
          </div>

          <article className="dashboard-card battle-table-card">
            <div className="section-row battle-table-head">
              <div>
                <span className="card-label">Bomb Kills</span>
                <h3>Bombs acumuladas</h3>
              </div>
            </div>

            {performance.bombs.length > 0 ? (
              <div
                className="battle-table battle-table-summary"
                style={{
                  gridTemplateColumns:
                    "minmax(180px, 1.4fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr)",
                }}
              >
                <div className="battle-table-header">Bomb</div>
                <div className="battle-table-header">Media Kills</div>
                <div className="battle-table-header">% Kills</div>

                {performance.bombs.map((bomb) => (
                  <Fragment key={bomb.bombGroupName}>
                    <div className="battle-table-cell battle-name-cell">
                      {bomb.bombGroupName}
                    </div>
                    <div className="battle-table-cell">
                      <span className="battle-value red">
                        {formatCompact(bomb.averageKills)}
                      </span>
                    </div>
                    <div className="battle-table-cell">
                      <span className="battle-value gold">
                        {formatPercent(bomb.sharePercent)}
                      </span>
                    </div>
                  </Fragment>
                ))}
              </div>
            ) : (
              <p className="empty">Todavia no hay Bomb kills acumuladas.</p>
            )}
          </article>

          <PerformanceAttendanceSection
            initialData={{
              selectedMonth: performance.selectedMonth,
              selectedMonthLabel: performance.selectedMonthLabel,
              pagination: performance.pagination,
              attendance: performance.attendance,
            }}
          />
          <PerformanceMemberWeaponsPanel />
        </>
      )}
    </section>
  );
}
