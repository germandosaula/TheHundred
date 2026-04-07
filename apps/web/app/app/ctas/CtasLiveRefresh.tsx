"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function CtasLiveRefresh() {
  const router = useRouter();
  const liveRefreshEnabled = process.env.NEXT_PUBLIC_CTA_LIVE_REFRESH === "1";

  if (!liveRefreshEnabled) {
    return null;
  }

  useEffect(() => {
    let isTicking = false;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible" || isTicking) {
        return;
      }
      isTicking = true;
      router.refresh();
      window.setTimeout(() => {
        isTicking = false;
      }, 1200);
    }, 120000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [router]);

  return null;
}
