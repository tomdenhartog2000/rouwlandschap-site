"use client";

import { useEffect, useRef, useState } from "react";

type FullscreenDocument = Document & { webkitExitFullscreen?: () => Promise<void>; webkitFullscreenElement?: Element; };
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void>; };
type TestContribution = { id: string; title: string; description: string; kind: string; image: string; x: number; y: number; };

export default function Landschap() {
  const landscapeRef = useRef<HTMLElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [contributions, setContributions] = useState<TestContribution[]>([]);
  const [openContribution, setOpenContribution] = useState<TestContribution | null>(null);

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
    try {
      const saved = JSON.parse(window.localStorage.getItem("rouwdieren-testbijdragen") || "[]") as TestContribution[];
      setContributions(saved);
    } catch {
      setContributions([]);
    }
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
      {contributions.map((contribution, index) => <button key={contribution.id} type="button" className={`created-rouwdiers-spark spark-variant-${index % 3}`} style={{ left: `${contribution.x}%`, top: `${contribution.y}%` }} onClick={() => setOpenContribution(contribution)} aria-label={`Open ${contribution.title}`}><span /><span /><span /></button>)}
      <button type="button" className="fullscreen-button" aria-label={isFullscreen ? "Sluit schermvullende weergave" : "Open schermvullende weergave"} onClick={toggleFullscreen}>
        <span className="fullscreen-icon" aria-hidden="true" />
      </button>
      {openContribution && <div className="created-contribution-modal" role="dialog" aria-modal="true" aria-label={openContribution.title} onClick={() => setOpenContribution(null)}><section className="created-contribution-card" onClick={(event) => event.stopPropagation()}><button type="button" className="created-contribution-close" onClick={() => setOpenContribution(null)} aria-label="Sluit rouwdier">×</button><p>{openContribution.kind}</p><h1>{openContribution.title}</h1>{openContribution.image && <img src={openContribution.image} alt="Bijdrage van de bezoeker" />}{openContribution.description && <div>{openContribution.description}</div>}</section></div>}
    </main>
  );
}
