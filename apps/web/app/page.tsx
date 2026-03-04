import Image from "next/image";
import Link from "next/link";
import { getLandingData } from "./lib";
import { PageEntryLoader } from "./PageEntryLoader";

export default async function LandingPage() {
  const { authStart, me, slots } = await getLandingData();
  const hasLinkedUser = Boolean(me);
  const showDevLogin = (process.env.API_BASE_URL ?? "http://localhost:3001").startsWith("http://localhost:");
  const devDiscordId = process.env.DEV_LOGIN_DISCORD_ID;
  const devLoginUrl =
    showDevLogin && devDiscordId
      ? `${process.env.API_BASE_URL ?? "http://localhost:3001"}/auth/dev-login?discord_id=${encodeURIComponent(devDiscordId)}`
      : null;

  return (
    <PageEntryLoader message="Bienvenido a The Hundred">
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
        <nav className="landing-links">
          <a href="#hero">Inicio</a>
          <a href="#informacion">Informacion</a>
          <a href="#requisitos">Requisitos</a>
        </nav>
        <div className="landing-actions">
          {hasLinkedUser ? <Link className="button ghost" href="/app">Abrir dashboard</Link> : null}
          {devLoginUrl ? (
            <a className="button ghost" href={devLoginUrl}>
              Dev Login
            </a>
          ) : null}
          <a
            className="button primary"
            href={authStart?.authorizationUrl ?? "#"}
            aria-disabled={!authStart?.authorizationUrl}
          >
            Login
          </a>
        </div>
        </header>

        <section className="landing-hero" id="hero">
          <div className="hero-block">
            <div className="hero-copy">
            <p className="eyebrow">Albion Online | Experienced ZvZ</p>
            <h1>Content ZvZ para jugadores con manos</h1>
            <p className="hero-text">
              The Hundred es la guild hispana de Albion Online enfocada en jugadores experimentados que entienden el juego y cumplen su rol.
              <br /><br />
              Cero dramas. Cero handholding. Cero paciencia con leechers.
              <br /><br />
              Para jugadores que rinden, conocen sus roles y buscan vivir el contenido ZvZ con estructura, coordinación y mentalidad competitiva real.
            </p>
            <div className="hero-actions">
              <a
                className="button primary"
                href={authStart?.authorizationUrl ?? "#"}
                aria-disabled={!authStart?.authorizationUrl}
              >
                Quiero Unirme
              </a>
              <Link className="button ghost" href={hasLinkedUser ? "/app" : "#informacion"}>
                {hasLinkedUser ? "Ir al dashboard" : "Ver requisitos"}
              </Link>
            </div>
            <div className="hero-rail" aria-label="Resumen operativo">
              <div className="hero-rail-item">
                <span className="hero-rail-value">No Drama</span>
                <span className="hero-rail-label">Mentalidad competitiva y foco en equipo sin toxicidad</span>
              </div>
              <div className="hero-rail-item">
                <span className="hero-rail-value">ZvZ</span>
                <span className="hero-rail-label">Contenido principal, mediana escala, búsqueda de contenido directo.</span>
              </div>
              <div className="hero-rail-item">
                <span className="hero-rail-value">Organización</span>
                <span className="hero-rail-label">Se parte del council, meritocracia y votaciones.</span>
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
                  <p>Sólo 100 jugadores, activos, con huevos y con foco en contenido ZvZ.</p>
                </div>
                <div className="hero-card">
                  <span className="card-label">Como acceder</span>
                  <ul className="signal-list">
                    <li>Aplicas a través de la web</li>
                    <li>Un oficial se pondrá en contacto contigo en Discord</li>
                    <li>Tienes acceso a la War Room y Discord</li>
                    <li>Mantienes tu culo limpio y te comportas como un adulto</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section" id="informacion">
          <div className="section-heading">
            <p className="eyebrow">Informacion del proyecto</p>
            <h2>Una guild creada para cambiar como funcionan las guilds hispanas en Albion Online</h2>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <span className="card-label">Identidad</span>
              <h3>Full Contenido ZvZ</h3>
              <p>
                Buscamos poder ofrecer contenido ZvZ de calidad y directo para jugadores que escapan del Queue Simulator y las guerras del anillo.
              </p>
            </article>
            <article className="feature-card">
              <span className="card-label">Dirección</span>
              <h3>Meritocracia y Votaciones</h3>
              <p>
                Todas las decisiones serán votadas por los jugadores, además de que el que lo merezca tendrá la oportunidad de formar parte del council.
              </p>
            </article>
            <article className="feature-card">
              <span className="card-label">Valores</span>
              <h3>The 100th</h3>
              <p>
                The Hundred se concibe como guild que busca ser única, solo 100 jugadores, todos con la misma mentalidad, todos con el mismo objetivo, si no cumples tu plaza la ocupara otro.
              </p>
            </article>
          </div>
        </section>

        <section className="landing-section split" id="requisitos">
          <div className="section-heading">
            <p className="eyebrow">Requisitos</p>
            <h2>Si eres un jugador más, esta guild no es para ti.</h2>
          </div>
          <div className="timeline">
            <article className="timeline-step">
              <strong>01</strong>
              <div>
                <h3>Aplica en la web</h3>
                <p>Enlazas tu discord y entras al proceso de reclutamiento.</p>
              </div>
            </article>
            <article className="timeline-step">
              <strong>02</strong>
              <div>
                <h3>Validacion en discord</h3>
                <p>Un oficial se pondra en contacto contigo para validar si cumples con los requisitos.</p>
              </div>
            </article>
            <article className="timeline-step">
              <strong>03</strong>
              <div>
                <h3>Se te asignará rol Trial</h3>
                <p>Tendras acceso a todo el ecosistema de The Hundred. Tienes 1 semana para demostrar que vales la pena.</p>
              </div>
            </article>
            <article className="timeline-step">
              <strong>04</strong>
              <div>
                <h3>Se te asignará rol 100th</h3>
                <p>Si cumples con los requisitos y te comportas como un adulto, serás miembro de The Hundred.</p>
              </div>
            </article>
          </div>
        </section>
      </main>
    </PageEntryLoader>
  );
}
