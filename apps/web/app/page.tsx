import Image from "next/image";
import Link from "next/link";
import { getLandingData } from "./lib";
import { LandingLaunchControls } from "./LandingLaunchControls";
import { PageEntryLoader } from "./PageEntryLoader";

const defaultDevDiscordId = "173816196720885760";
const defaultDiscordInviteUrl = "https://discord.gg/uad2bAXQdz";

interface LandingPageProps {
  searchParams: Promise<{
    invite?: string;
  }>;
}

export default async function LandingPage({ searchParams }: LandingPageProps) {
  const params = await searchParams;
  const inviteCode = params.invite?.trim();
  const { authStartUrl, hasPrivateAccess, inviteValid, slots } =
    await getLandingData(inviteCode);
  const currentYear = new Date().getUTCFullYear();
  const showDevLogin = (
    process.env.API_BASE_URL ?? "http://localhost:3001"
  ).startsWith("http://localhost:");
  const devDiscordId = process.env.DEV_LOGIN_DISCORD_ID ?? defaultDevDiscordId;
  const devLoginUrl =
    showDevLogin && devDiscordId
      ? `${process.env.API_BASE_URL ?? "http://localhost:3001"}/auth/dev-login?discord_id=${encodeURIComponent(devDiscordId)}`
      : null;
  const discordInviteUrl =
    process.env.DISCORD_INVITE_URL ?? defaultDiscordInviteUrl;
  const enforceLaunchCountdown = process.env.LAUNCH_COUNTDOWN_ENABLED !== "0";
  const launchAtMs = new Date("2026-03-23T12:00:00+01:00").getTime();
  const hasLaunched = Date.now() >= launchAtMs;
  const shouldLockJoin = enforceLaunchCountdown && !hasLaunched && !inviteValid;
  const canJoin = !shouldLockJoin;
  const appPreviewFeatures = [
    {
      id: "comps-builds",
      eyebrow: "App + Discord",
      title: "Comps y Builds",
      description:
        "Creación y edición de builds y comps desde la app con integración en todo el ecosistema de The Hundred.",
      screenshotPath: "/comps.avif",
    },
    {
      id: "attendance",
      eyebrow: "Control de Attendance",
      title: "Attendance",
      description:
        "Mide asistencia real por CTA, detecta consistencia del signup del player en la CTA y compara con las Battles, además visualiza evolución mensual y trackea a cada player.",
      screenshotPath: "/Gestion.avif",
    },
    {
      id: "performance",
      eyebrow: "Analítica ZvZ",
      title: "Rendimiento",
      description:
        "Analiza rendimiento de cada player, separa Bomb vs Main Zerg y consolida métricas por cada batalla y acumuladas para su revisión.",
      screenshotPath: "/Rendimiento.avif",
    },
    {
      id: "economy",
      eyebrow: "Balance + Lootsplit",
      title: "Economía",
      description:
        "Automatiza el pago de loot splits, controla balances por miembro y ejecuta los pagos con trazabilidad para la máxima transparencia.",
      screenshotPath: "/Econ.avif",
    },
  ] as const;

  return (
    <PageEntryLoader
      message="Bienvenido a The Hundred"
      storageKey="entry-loader-landing"
    >
      <main className="landing-shell">
        <header className="landing-nav">
          <Link className="brand-mark" href="/">
            <Image
              alt="The Hundred logo"
              className="brand-logo"
              height={56}
              priority
              src="/thehundred_logo.png"
              width={56}
            />
            <span className="brand-copy">
              <strong>The Hundred</strong>
              <span>Spanish ZvZ Guild</span>
            </span>
          </Link>
          <LandingLaunchControls
            devLoginUrl={devLoginUrl}
            discordUrl={discordInviteUrl}
            enforceCountdown={enforceLaunchCountdown}
            hasValidInvite={inviteValid}
            hasActiveSession={hasPrivateAccess}
            loginUrl={authStartUrl}
          />
        </header>

        <section className="landing-hero" id="hero">
          <div className="hero-block">
            <div className="hero-copy">
              <p className="eyebrow">Albion Online | Experienced ZvZ</p>
              <h1>Content ZvZ para jugadores experimentados</h1>
              <p className="hero-text">
                The Hundred es una guild hispana de Albion Online enfocada en
                jugadores con experiencia que comprenden el juego y cumplen su
                rol dentro del equipo. <br />
                <br />
                Cero dramas. Cero handholding. Cero paciencia con leechers.
                <br />
                <br />
                Para jugadores que rinden, conocen sus roles y buscan vivir el
                contenido ZvZ con cabeza, coordinación y mentalidad competitiva
                real.
              </p>
              <div className="hero-actions">
                <a
                  aria-disabled={!canJoin}
                  className={`button primary ${!canJoin ? "is-disabled" : ""}`}
                  href={canJoin ? authStartUrl : "#"}
                >
                  Quiero Unirme
                </a>
                <Link
                  className="button ghost"
                  href={hasPrivateAccess ? "/app" : "#informacion"}
                >
                  {hasPrivateAccess ? "Ir al dashboard" : "Ver requisitos"}
                </Link>
              </div>
              <div className="hero-rail" aria-label="Resumen operativo">
                <div className="hero-rail-item">
                  <span className="hero-rail-value">No Drama</span>
                  <span className="hero-rail-label">
                    Mentalidad de equipo, compromiso con el rendimiento y sin
                    toxicidad.
                  </span>
                </div>
                <div className="hero-rail-item">
                  <span className="hero-rail-value">ZvZ</span>
                  <span className="hero-rail-label">
                    Contenido principal, mediana escala, búsqueda de contenido
                    directo. Full LootSplit.
                  </span>
                </div>
                <div className="hero-rail-item">
                  <span className="hero-rail-value">Organización</span>
                  <span className="hero-rail-label">
                    Estructura clara de roles, promoción interna y sistema
                    basado en mérito y contribución.
                  </span>
                </div>
              </div>
            </div>

            <div className="hero-spotlight">
              <div className="hero-logo-panel">
                <Image
                  alt="The Hundred emblem"
                  className="hero-logo"
                  height={420}
                  priority
                  src="/thehundred_logo.png"
                  width={420}
                />
              </div>
              <div className="hero-data">
                <div className="hero-card highlight">
                  <span className="card-label">Slots Disponibles</span>
                  <strong className="hero-metric">
                    {slots?.slotsOpen ?? "--"}
                    <span>/100</span>
                  </strong>
                  <p>
                    Sólo 100 jugadores, activos, con huevos y con foco en
                    contenido ZvZ.
                  </p>
                </div>
                <div className="hero-card">
                  <span className="card-label">Como acceder</span>
                  <ul className="signal-list">
                    <li>Aplicas a través de la web</li>
                    <li>Se te abrirá un ticket en Discord.</li>
                    <li>
                      Mantienes tu culo limpio y te comportas como un adulto
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="informacion">
          <div className="project-claim">
            <div className="project-claim-main">
              <p className="eyebrow">Informacion del proyecto</p>
              <h2>
                Rediseñando como funcionan las guilds hispanas: estructura,
                criterio y resultados.
              </h2>
              <p className="lede">
                The Hundred no vende humo. Nuestro proyecto es diferente, lo
                sabemos, buscamos que cada miembro entienda su rol y su
                responsabilidad en la evolución del gremio.
              </p>
              <div className="project-claim-pills">
                <span>Sin toxicidad</span>
                <span>Mejora tu performance</span>
                <span>Disciplina y compromiso</span>
              </div>
            </div>

            <div className="project-claim-grid">
              <article className="project-tile project-tile-identity">
                <span className="card-label">Identidad</span>
                <h3>Full Contenido ZvZ</h3>
                <p>
                  Contenido directo, constante y sin excusas. Puede exisistir
                  Garrapresta Simulator, no le cojas cariño a un terry ni HO.
                </p>
              </article>

              <article className="project-tile project-tile-direction">
                <span className="card-label">Democracia</span>
                <h3>Dirección</h3>
                <p>
                  Decisiones transparentes y votación constante. <br />
                  El core elige a sus compañeros votando 2 veces al mes.
                </p>
              </article>

              <article className="project-tile project-tile-values">
                <span className="card-label">Valores</span>
                <h3>The Hundred</h3>
                <p>
                  Plazas limitadas a 100 players para mantener nivel
                  competitivo, cohesión y exigencia en las CTAs.
                </p>
              </article>

              <article className="project-tile project-tile-claim">
                <span className="card-label">Claim</span>
                <h3>No somos para todos.</h3>
                <p>
                  Somos para quien busca ser el mejor, respeta al equipo y
                  cumple su parte.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-section" id="requisitos">
          <div className="section-heading">
            <p className="eyebrow">App + Discord</p>
            <h2>Operativa automatizada para la guild.</h2>
            <p className="lede">
              Un ecosistema diseñado para facilitar la gestión del gremio.{" "}
              <br />
              Toda la gestión conectada en una sola aplicación.
            </p>
          </div>
          <div className="app-preview-grid">
            {appPreviewFeatures.map((feature) => (
              <article
                className={`app-preview-card app-preview-card-${feature.id}`}
                key={feature.id}
              >
                <div className="app-preview-shot">
                <Image
                  alt={`${feature.title} preview`}
                  className="app-preview-image"
                  fill
                  quality={65}
                  sizes="(max-width: 1100px) 100vw, 50vw"
                  src={feature.screenshotPath}
                />
                  <div className="app-preview-overlay">
                    <span>{feature.eyebrow}</span>
                  </div>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="landing-footer">
          <div className="landing-footer-inner">
            <div className="landing-footer-brand">
              <Image
                alt="The Hundred logo"
                className="landing-footer-logo"
                height={40}
                src="/thehundred_logo.png"
                width={40}
              />
              <strong>The Hundred</strong>
            </div>
            <p className="landing-footer-copy">© {currentYear} The Hundred</p>
            <p className="landing-footer-copy">Desarrollado por LaHuella</p>
          </div>
        </footer>
      </main>
    </PageEntryLoader>
  );
}
