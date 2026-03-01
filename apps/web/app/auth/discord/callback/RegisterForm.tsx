"use client";

import { useState } from "react";

interface RegisterFormProps {
  avatarUrl?: string;
  discordId: string;
  suggestedName: string;
}

export function RegisterForm({ avatarUrl, discordId, suggestedName }: RegisterFormProps) {
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
        <p>Solicitud enviada. El siguiente paso ocurre en el Discord de The Hundred.</p>
        <p className="empty">
          El bot abrira un ticket con tu formulario para que council revise tu entrada y te asigne el rol
          correspondiente.
        </p>
        <p className="empty">
          Tu acceso completo se activa cuando tengas estado valido en web y rol sincronizado en Discord.
        </p>
      </div>
    );
  }

  return (
    <form className="register-form" onSubmit={onSubmit}>
      <label className="field">
        <span>Rol Principal</span>
        <input
          name="primaryRole"
          onChange={(event) => setPrimaryRole(event.target.value)}
          required
          value={primaryRole}
        />
      </label>
      <label className="field">
        <span>Rol Secundario</span>
        <input
          name="secondaryRole"
          onChange={(event) => setSecondaryRole(event.target.value)}
          required
          value={secondaryRole}
        />
      </label>
      <label className="field">
        <span>Disponibilidad UTC</span>
        <input
          name="availabilityUtc"
          onChange={(event) => setAvailabilityUtc(event.target.value)}
          placeholder="Ej. 18:00-23:00 UTC"
          required
          value={availabilityUtc}
        />
      </label>
      <label className="field">
        <span>Gremios Anteriores</span>
        <input
          name="previousGuilds"
          onChange={(event) => setPreviousGuilds(event.target.value)}
          placeholder="Lista breve de guilds previas"
          required
          value={previousGuilds}
        />
      </label>
      <button className="button primary" disabled={status === "submitting"} type="submit">
        {status === "submitting" ? "Registrando..." : "Solicitar reclutamiento"}
      </button>
      {error ? <p className="empty">{error}</p> : null}
    </form>
  );
}
