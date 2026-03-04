"use client";

import { useState } from "react";

interface RegisterFormProps {
  avatarUrl?: string;
  discordId: string;
  suggestedName: string;
  discordInviteUrl: string;
}

export function RegisterForm({
  avatarUrl,
  discordId,
  suggestedName,
  discordInviteUrl
}: RegisterFormProps) {
  const [albionName, setAlbionName] = useState("");
  const [primaryRole, setPrimaryRole] = useState("");
  const [secondaryRole, setSecondaryRole] = useState("");
  const [availabilityUtc, setAvailabilityUtc] = useState("");
  const [previousGuilds, setPreviousGuilds] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    try {
      const response = await fetch("/register", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          displayName: suggestedName,
          discordId,
          albionName,
          avatarUrl,
          timezone: availabilityUtc,
          mainRole: primaryRole,
          zvzExperience: `Rol secundario: ${secondaryRole}\nGremios anteriores: ${previousGuilds}`,
          notes: ""
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? `Registration failed with status ${response.status}`);
      }

      setStatus("success");
    } catch (submissionError) {
      setStatus("error");
      setError(submissionError instanceof Error ? submissionError.message : "Registration failed");
    }
  }

  if (status === "success") {
    return (
      <div className="register-form">
        <hr className="register-success-separator" />
        <p>Solicitud enviada. El siguiente paso ocurre en el Discord de The Hundred.</p>
        <p className="empty">
          El bot abrira un ticket con tu formulario para que council revise tu entrada y te asigne el rol
          correspondiente.
        </p>
        <p className="empty">
          Tu acceso completo se activa cuando tengas estado valido en web y rol sincronizado en Discord.
        </p>
        <div className="register-form-actions">
          <a className="button primary" href="/">
            Volver al inicio
          </a>
          <a className="button ghost" href={discordInviteUrl} rel="noreferrer" target="_blank">
            Ir al Discord
          </a>
        </div>
      </div>
    );
  }

  return (
    <form className="register-form" onSubmit={onSubmit}>
      <p className="register-required-note">Todos los campos son obligatorios.</p>
      <label className="field">
        <span>
          Nombre en Albion <em>*</em>
        </span>
        <input
          name="albionName"
          onChange={(event) => setAlbionName(event.target.value)}
          placeholder="El nombre tiene que ser exactamente el de tu personaje de Albion"
          required
          value={albionName}
        />
      </label>
      <label className="field">
        <span>
          Rol Principal <em>*</em>
        </span>
        <input
          name="primaryRole"
          onChange={(event) => setPrimaryRole(event.target.value)}
          required
          value={primaryRole}
        />
      </label>
      <label className="field">
        <span>
          Rol Secundario <em>*</em>
        </span>
        <input
          name="secondaryRole"
          onChange={(event) => setSecondaryRole(event.target.value)}
          required
          value={secondaryRole}
        />
      </label>
      <label className="field">
        <span>
          Disponibilidad UTC <em>*</em>
        </span>
        <input
          name="availabilityUtc"
          onChange={(event) => setAvailabilityUtc(event.target.value)}
          placeholder="Ej. 18:00-23:00 UTC"
          required
          value={availabilityUtc}
        />
      </label>
      <label className="field">
        <span>
          Gremios Anteriores <em>*</em>
        </span>
        <input
          name="previousGuilds"
          onChange={(event) => setPreviousGuilds(event.target.value)}
          placeholder="Lista breve de guilds previas"
          required
          value={previousGuilds}
        />
      </label>
      <div className="register-form-actions">
        <button className="button primary" disabled={status === "submitting"} type="submit">
          {status === "submitting" ? "Registrando..." : "Solicitar reclutamiento"}
        </button>
      </div>
      {error ? <p className="empty">{error}</p> : null}
    </form>
  );
}
