"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CtaFinalizeButton({ ctaId }: { ctaId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function finalizeCta() {
    if (busy) {
      return;
    }
    const confirmed = window.confirm("¿Finalizar CTA? Esto congelará attendance/puntos.");
    if (!confirmed) {
      return;
    }

    setBusy(true);
    const response = await fetch(`/ctas/finalize?ctaId=${encodeURIComponent(ctaId)}`, {
      method: "POST"
    });
    if (!response.ok) {
      let message = "No se pudo finalizar la CTA.";
      try {
        const payload = (await response.json()) as { error?: string };
        if (payload.error) {
          message = payload.error;
        }
      } catch {}
      window.alert(message);
      setBusy(false);
      return;
    }
    setBusy(false);
    router.push("/app/ctas");
    router.refresh();
  }

  return (
    <button className="button ghost compact" disabled={busy} onClick={() => void finalizeCta()} type="button">
      {busy ? "Finalizando..." : "Finalizar CTA"}
    </button>
  );
}
