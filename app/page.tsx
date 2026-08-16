"use client";

import { useEffect, useRef, useState } from "react";

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void>;
  webkitFullscreenElement?: Element;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

export default function Home() {
  const landscapeRef = useRef<HTMLElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateFullscreenState = () => {
      const fullscreenDocument = document as FullscreenDocument;
      setIsFullscreen(Boolean(document.fullscreenElement || fullscreenDocument.webkitFullscreenElement));
    };

    document.addEventListener("fullscreenchange", updateFullscreenState);
    document.addEventListener("webkitfullscreenchange", updateFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreenState);
      document.removeEventListener("webkitfullscreenchange", updateFullscreenState);
    };
  }, []);

  const toggleFullscreen = async () => {
    const landscape = landscapeRef.current as FullscreenElement | null;
    const fullscreenDocument = document as FullscreenDocument;

    if (!landscape) return;

    try {
      if (document.fullscreenElement || fullscreenDocument.webkitFullscreenElement) {
        const exit = document.exitFullscreen || fullscreenDocument.webkitExitFullscreen;
        await exit?.call(document);
      } else {
        const request = landscape.requestFullscreen || landscape.webkitRequestFullscreen;
        await request?.call(landscape);
      }
    } catch {
      // Some mobile browsers keep their own controls; the landscape remains usable.
    }
  };

  return (
    <main className="landscape-shell" ref={landscapeRef}>
      <iframe
        className="landscape-frame"
        src="/landschap.html"
        title="Interactief Testlandschap"
        allow="fullscreen"
      />
      <button
        type="button"
        className="fullscreen-button"
        aria-label={isFullscreen ? "Sluit schermvullende weergave" : "Open schermvullende weergave"}
        onClick={toggleFullscreen}
      >
        <span className="fullscreen-icon" aria-hidden="true" />
      </button>
      <a className="make-link" href="/maak">
        <span className="make-link-spark" aria-hidden="true" />
        vorm een rouwdier
      </a>
    </main>
  );
}
