"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

interface LandingLaunchControlsProps {
  devLoginUrl: string | null;
  discordUrl: string;
  hasValidInvite: boolean;
  loginUrl?: string;
  enforceCountdown: boolean;
}

const launchAt = new Date("2026-03-23T12:00:00+01:00").getTime();

export function LandingLaunchControls({
  devLoginUrl,
  discordUrl,
  hasValidInvite,
  loginUrl,
  enforceCountdown
}: LandingLaunchControlsProps) {
  const [now, setNow] = useState(() => Date.now());

  const remainingMs = launchAt - now;
  useEffect(() => {
    if (remainingMs <= 0) {
      return;
    }

    const intervalMs =
      remainingMs > 6 * 60 * 60 * 1000 ? 60_000 : remainingMs > 60 * 60 * 1000 ? 15_000 : 1_000;
    const timerId = window.setInterval(() => {
      setNow(Date.now());
    }, intervalMs);

    return () => {
      window.clearInterval(timerId);
    };
  }, [remainingMs]);

  const hasLaunched = remainingMs <= 0;
  const countdownText = useMemo(() => formatCountdown(remainingMs), [remainingMs]);
  const shouldLockLogin = enforceCountdown && !hasLaunched && !hasValidInvite;
  const canLogin = !shouldLockLogin && Boolean(loginUrl);
  const loginLabel = "Login";

  return (
    <>
      <div className="landing-countdown" aria-live="polite">
        <span>The Hundred se abre en:</span>
        <strong>{hasLaunched ? "Abierto ahora" : countdownText}</strong>
      </div>
      <div className="landing-actions">
        <a className="button ghost" href={discordUrl} rel="noreferrer" target="_blank">
          <Image
            alt=""
            aria-hidden
            className="discord-button-icon"
            height={18}
            src="/discord-white-icon.webp"
            width={18}
          />
          Discord
        </a>
        {devLoginUrl ? (
          <a className="button ghost" href={devLoginUrl}>
            Dev Login
          </a>
        ) : null}
        <a
          aria-disabled={!canLogin}
          className={`button primary ${!canLogin ? "is-disabled" : ""}`}
          href={canLogin ? loginUrl : "#"}
        >
          {loginLabel}
        </a>
      </div>
    </>
  );
}

function formatCountdown(value: number): string {
  const clamped = Math.max(0, value);
  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
