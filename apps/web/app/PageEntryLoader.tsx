"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface PageEntryLoaderProps {
  children: React.ReactNode;
  message: string;
}

const LOADER_DURATION_MS = 3000;

export function PageEntryLoader({ children, message }: PageEntryLoaderProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsVisible(false);
    }, LOADER_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

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
