import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccessWatcher } from "./AccessWatcher";
import { RegisterForm } from "./RegisterForm";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";
const discordInviteUrl = "https://discord.gg/uad2bAXQdz";

interface CallbackPageProps {
  searchParams: Promise<{
    session_token?: string;
    discord_id?: string;
    discord_name?: string;
    avatar_url?: string;
    linked?: string;
    role?: string;
    display_name?: string;
    error?: string;
  }>;
}

async function hasPrivateAccess(sessionToken?: string): Promise<boolean> {
  if (!sessionToken) {
    return false;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/private/access`, {
      cache: "no-store",
      headers: {
        "x-session-token": sessionToken
      }
    });

    return response.ok;
  } catch {
    return false;
  }
}

export default async function DiscordCallbackPage({ searchParams }: CallbackPageProps) {
  const params = await searchParams;
  const sessionToken = (await cookies()).get("th_session")?.value;
  const privateAccess = await hasPrivateAccess(sessionToken);
  const isLinked = params.linked === "1";

  if (isLinked) {
    redirect("/app");
  }

  if (params.error) {
    return (
      <main className="page">
        <section className="panel auth-panel">
          <h1>Acceso con Discord</h1>
          <p className="empty">Discord devolvio un error durante el acceso: {params.error}</p>
        </section>
      </main>
    );
  }

  if (!params.session_token) {
    return (
      <main className="page">
        <section className="panel auth-panel">
          <h1>Acceso con Discord</h1>
          <p className="empty">No se recibio el contexto necesario para completar el acceso.</p>
        </section>
      </main>
    );
  }

  const displayName = params.display_name ?? params.discord_name ?? "Discord User";

  return (
    <main className="page">
      <section className="panel auth-panel">
        <p className="eyebrow">The Hundred | Reclutamiento</p>
        <h1>{params.discord_name ?? "Discord User"}</h1>
        {isLinked && privateAccess ? (
          <>
            <p>
              Identidad enlazada como <strong>{displayName}</strong> con rol <strong>{params.role}</strong>.
            </p>
            <p className="empty">
              Ya estas dentro. El acceso privado de The Hundred esta disponible.
            </p>
            <div className="actions">
              <a className="button primary" href={discordInviteUrl} target="_blank" rel="noreferrer">
                Ir al Discord
              </a>
              <a className="button ghost" href={privateAccess ? "/app" : "/"}>
                {privateAccess ? "Ir al dashboard" : "Volver a la landing"}
              </a>
            </div>
          </>
        ) : (
          <>
            <p className="empty">
              {isLinked
                ? "Tu identidad web ya esta enlazada, pero aun no tienes acceso privado. Completa el formulario para que council continue tu reclutamiento en Discord."
                : "Tu identidad Discord existe, pero todavia no hay perfil enlazado en The Hundred. Completa el formulario para abrir tu proceso de reclutamiento."}
            </p>
            <AccessWatcher enabled={isLinked} />
            {params.discord_id ? (
              <RegisterForm
                avatarUrl={params.avatar_url}
                discordId={params.discord_id}
                discordInviteUrl={discordInviteUrl}
                suggestedName={params.discord_name ?? "Discord User"}
              />
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
