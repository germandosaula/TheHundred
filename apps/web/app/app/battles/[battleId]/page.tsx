import Link from "next/link";
import { redirect } from "next/navigation";
import { BattleAllianceTable } from "./BattleAllianceTable";
import { BattleGuildTable } from "./BattleGuildTable";
import { BattlePlayersComposition } from "./BattlePlayersComposition";
import { BattleRosterGroups } from "./BattleRosterGroups";
import { BattlePlayersTable } from "./BattlePlayersTable";
import {
  getPrivateBattleDetailData,
  type BattleTopEntry
} from "../../../lib";

function formatBattleTime(value: string) {
  const date = new Date(value);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");

  return `${day}/${month}/${year}, ${hour}:${minute}`;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("es-ES", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(value);
}

function formatBattleTitle(guilds: string[]) {
  const visibleGuilds = guilds.filter(Boolean).slice(0, 3);
  if (visibleGuilds.length === 0) {
    return "Battle";
  }

  return guilds.length > 3 ? `${visibleGuilds.join(", ")}, ...` : visibleGuilds.join(", ");
}

function TopCard({
  label,
  entry,
  tone,
  formatter = formatCompactNumber
}: {
  label: string;
  entry?: BattleTopEntry;
  tone: "red" | "cyan" | "purple" | "muted";
  formatter?: (value: number) => string;
}) {
  return (
    <article className={`dashboard-card battle-top-card ${tone}`}>
      <span className="card-label">{label}</span>
      {entry ? (
        <>
          <strong>{entry.playerName}</strong>
          <span className="battle-top-meta">
            {entry.allianceName ? `[${entry.allianceName}] ` : ""}
            {entry.guildName ?? "Guild desconocida"}
          </span>
          <div className="battle-top-value">{formatter(entry.value)}</div>
        </>
      ) : (
        <>
          <strong>No disponible</strong>
          <span className="battle-top-meta">Este detalle no trae esa estadística todavía.</span>
          <div className="battle-top-value">-</div>
        </>
      )}
    </article>
  );
}

export default async function BattleDetailPage({
  params
}: {
  params: Promise<{ battleId: string }>;
}) {
  const { battleId } = await params;
  const { me, battle } = await getPrivateBattleDetailData(battleId);

  if (!me) {
    redirect("/");
  }

  if (!battle) {
    return (
      <section className="dashboard-stack">
        <article className="dashboard-card">
          <div className="section-row">
            <div>
              <span className="card-label">Battle</span>
              <h2>No se ha encontrado esa battle.</h2>
            </div>
            <div className="actions">
              <Link className="button ghost" href="/app/battles">
                Volver a Battles
              </Link>
            </div>
          </div>
          <p className="lede">
            Si vienes de una battle antigua o AlbionBB no devuelve detalle para ese id, esta vista puede no estar disponible.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="dashboard-stack battle-detail-page">
      <article className="dashboard-card battle-detail-hero">
        <Link className="battle-back-link" href="/app/battles">
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path
              d="m15 6-6 6 6 6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          Volver a Battles
        </Link>

        <div>
          <span className="card-label">Battle</span>
          <h1>{formatBattleTitle(battle.guilds)}</h1>
        </div>

        <div className="battle-detail-start">
          <span>Inicio</span>
          <strong>{formatBattleTime(battle.startTime)} UTC</strong>
        </div>

        <div className="battle-top-grid">
          <TopCard entry={battle.topKills} label="Top Kills" tone="red" />
          <TopCard entry={battle.topHeal} label="Top Heal" tone="cyan" />
          <TopCard entry={battle.topDamage} label="Top Damage" tone="purple" />
          <TopCard entry={battle.topDeathFame} label="Top Death Fame" tone="muted" />
        </div>
      </article>

      <div className="battle-detail-grid battle-detail-summaries">
        <BattleAllianceTable alliances={battle.alliancesSummary} />
        <BattleGuildTable guilds={battle.guildsSummary} />
      </div>

      <BattleRosterGroups groups={battle.rosterGroupsSummary} />
      <BattlePlayersTable players={battle.players} />
      <BattlePlayersComposition players={battle.players} />
    </section>
  );
}
