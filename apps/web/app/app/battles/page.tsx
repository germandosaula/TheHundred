import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrivateBattlesData } from "../../lib";

function formatBattleTime(value: string) {
  return new Date(value).toLocaleString("es-ES", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("es-ES", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(value);
}

function formatBattleTitle(guildName: string, opponentGuilds: string[]) {
  const uniqueGuilds = Array.from(new Set([guildName, ...opponentGuilds].filter(Boolean)));
  const visibleGuilds = uniqueGuilds.slice(0, 3).join(", ");
  return uniqueGuilds.length > 3 ? `${visibleGuilds}, ...` : visibleGuilds;
}

export default async function BattlesPage() {
  const { me, battles } = await getPrivateBattlesData();

  if (!me) {
    redirect("/");
  }

  const guildLabel = battles?.guildName ?? "guild configurada";

  return (
    <section className="dashboard-stack battles-page">
      <article className="dashboard-card battles-hero-card">
        <div className="section-row">
          <div>
            <span className="card-label">Battles</span>
            <h2>Las peleas donde el roster sí estuvo dentro.</h2>
          </div>
          <div className="actions">
            <span className="status-badge">{battles?.battles.length ?? 0} detectadas</span>
          </div>
        </div>
        <p className="lede">
          Esta vista lee Albion directamente y lista solo batallas donde {guildLabel} metió al menos{" "}
          {battles?.minGuildPlayers ?? 20} jugadores. Sirve para revisar actividad real sin depender del bot
          ni de CTAs manuales.
        </p>
      </article>

      {!battles ? (
        <article className="dashboard-card">
          <p className="empty">No se ha podido cargar Battles ahora mismo.</p>
        </article>
      ) : battles.battles.length > 0 ? (
        <div className="battle-list">
          {battles.battles.map((battle, index) => (
            <article className="dashboard-card battle-card battle-card-link" key={`${battle.id}-${battle.startTime}-${index}`}>
              <Link
                aria-label={`Abrir battle ${battle.id}`}
                className="battle-card-link-overlay"
                href={`/app/battles/${battle.id}`}
              />
              <div className="section-row">
                <div>
                  <span className="card-label">Battle</span>
                  <h2>{formatBattleTitle(battle.guildName, battle.opponentGuilds)}</h2>
                </div>
                <div className="battle-card-meta">
                  <span className="status-badge">Main Kills: XX</span>
                  <span className="status-badge">Bomb Kills: XX</span>
                </div>
              </div>

              <div className="battle-stats-grid">
                <div className="battle-stat">
                  <span>Inicio</span>
                  <strong>{formatBattleTime(battle.startTime)} UTC</strong>
                </div>
                <div className="battle-stat">
                  <span>Players</span>
                  <strong>{battle.totalPlayers}</strong>
                </div>
                <div className="battle-stat">
                  <span>Kills</span>
                  <strong>{battle.totalKills}</strong>
                </div>
                <div className="battle-stat">
                  <span>Fama total</span>
                  <strong>{formatCompactNumber(battle.totalFame)}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <article className="dashboard-card">
          <p className="empty">
            No hay batallas recientes que cumplan el umbral de {battles.minGuildPlayers} jugadores para{" "}
            {guildLabel}.
          </p>
        </article>
      )}
    </section>
  );
}
