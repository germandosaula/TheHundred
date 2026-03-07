"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function CtasLiveRefresh() {
  const router = useRouter();

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
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [router]);

  return null;
}
