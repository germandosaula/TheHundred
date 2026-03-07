"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface PageEntryLoaderProps {
  children: React.ReactNode;
  message: string;
  storageKey?: string;
}

const LOADER_DURATION_MS = 1500;

export function PageEntryLoader({ children, message, storageKey }: PageEntryLoaderProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (storageKey && window.sessionStorage.getItem(storageKey) === "1") {
      setIsVisible(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (storageKey) {
        window.sessionStorage.setItem(storageKey, "1");
      }
      setIsVisible(false);
    }, LOADER_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [storageKey]);

  if (isVisible) {
    return (
      <div className="entry-loader" role="status" aria-live="polite" aria-label={message}>
        <div className="entry-loader-copy">
          <Image
            alt="The Hundred logo"
            className="entry-loader-logo"
            height={164}
            priority
            src="/thehundred_logo.png"
            width={164}
          />
          <strong>{message}</strong>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
