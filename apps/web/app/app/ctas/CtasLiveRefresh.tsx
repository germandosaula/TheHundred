"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function CtasLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [router]);

  return null;
}
