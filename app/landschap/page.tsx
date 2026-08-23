"use client";

import { useEffect, useRef, useState } from "react";

type FullscreenDocument = Document & { webkitExitFullscreen?: () => Promise<void>; webkitFullscreenElement?: Element; };
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void>; };

export default function Landschap() {
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

  useEffect(() => {
    const openMakeSpace = (event: MessageEvent) => {
      if (event.data?.type === "rouwdier:open-make") window.location.assign("/maak");
    };
    window.addEventListener("message", openMakeSpace);
    return () => window.removeEventListener("message", openMakeSpace);
  }, []);

  const toggleFullscreen = async () => {
    const landscape = landscapeRef.current as FullscreenElement | null;
    const fullscreenDocument = document as FullscreenDocument;
    if (!landscape) return;
    try {
      if (document.fullscreenElement || fullscreenDocument.webkitFullscreenElement) {
        await (document.exitFullscreen || fullscreenDocument.webkitExitFullscreen)?.call(document);
      } else {
        await (landscape.requestFullscreen || landscape.webkitRequestFullscreen)?.call(landscape);
      }
    } catch {
      // Some mobile browsers keep their own controls; the landscape remains usable.
    }
  };

  return (
    <main className="landscape-shell" ref={landscapeRef}>
      <iframe className="landscape-frame" src="/landschap.html" title="Interactief Testlandschap" allow="fullscreen" />
      <button type="button" className="fullscreen-button" aria-label={isFullscreen ? "Sluit schermvullende weergave" : "Open schermvullende weergave"} onClick={toggleFullscreen}>
        <span className="fullscreen-icon" aria-hidden="true" />
      </button>
    </main>
  );
}
