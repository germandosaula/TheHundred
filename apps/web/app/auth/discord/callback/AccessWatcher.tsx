"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AccessWatcherProps {
  enabled: boolean;
}

export function AccessWatcher({ enabled }: AccessWatcherProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function checkAccess() {
      try {
        const response = await fetch("/access-status", {
          method: "GET",
          cache: "no-store"
        });

        if (!response.ok || cancelled) {
          return;
        }

        const payload = (await response.json()) as {
          authenticated: boolean;
          hasPrivateAccess: boolean;
        };

        if (payload.authenticated && payload.hasPrivateAccess) {
          router.replace("/app");
          router.refresh();
          return;
        }

        if (!cancelled) {
          setChecking(true);
        }
      } catch {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    void checkAccess();
    const intervalId = window.setInterval(checkAccess, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled, router]);

  if (!enabled) {
    return null;
  }

  return (
    <p className="empty">
      {checking
        ? "Comprobando acceso privado en vivo. En cuanto council te apruebe, entraras al dashboard automaticamente."
        : "No se ha podido comprobar el acceso en este momento. Puedes refrescar la pagina en unos segundos."}
    </p>
  );
}
