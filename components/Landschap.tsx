"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { LandscapeContribution } from "@/lib/contributions";

type FullscreenDocument = Document & { webkitExitFullscreen?: () => Promise<void>; webkitFullscreenElement?: Element; };
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void>; };
type TestContribution = LandscapeContribution & {
  image?: string;
  x: number;
  y: number;
};
type SparkParticle = { x: number; y: number; size: number; driftX: number; driftY: number; delay: number; duration: number; color: string; glow: string; };

const sparkShapes: SparkParticle[][] = [
  [
    { x: 16, y: 20, size: 7, driftX: 5, driftY: -7, delay: -1, duration: 6.6, color: "#f4dda2", glow: "rgba(244, 221, 162, .72)" },
    { x: 28, y: 9, size: 4, driftX: -5, driftY: 6, delay: -3, duration: 5.2, color: "#f4dda2", glow: "rgba(244, 221, 162, .55)" },
    { x: 34, y: 25, size: 5, driftX: 6, driftY: 3, delay: -2, duration: 7.3, color: "#efc7c4", glow: "rgba(239, 199, 196, .62)" },
    { x: 8, y: 34, size: 3, driftX: 4, driftY: -4, delay: -4, duration: 4.8, color: "#cbd8e4", glow: "rgba(203, 216, 228, .58)" },
  ],
  [
    { x: 11, y: 13, size: 4, driftX: 6, driftY: 5, delay: -2, duration: 5.8, color: "#efc7c4", glow: "rgba(239, 199, 196, .58)" },
    { x: 24, y: 21, size: 8, driftX: -7, driftY: 4, delay: -4, duration: 7.1, color: "#f4dda2", glow: "rgba(244, 221, 162, .72)" },
    { x: 39, y: 12, size: 3, driftX: 3, driftY: 7, delay: -1, duration: 4.9, color: "#d4cae4", glow: "rgba(212, 202, 228, .55)" },
    { x: 35, y: 34, size: 5, driftX: -6, driftY: -5, delay: -3, duration: 6.2, color: "#cbd8e4", glow: "rgba(203, 216, 228, .6)" },
    { x: 14, y: 37, size: 3, driftX: 5, driftY: -2, delay: -5, duration: 5.1, color: "#f4dda2", glow: "rgba(244, 221, 162, .5)" },
  ],
  [
    { x: 20, y: 6, size: 3, driftX: -4, driftY: 7, delay: -1, duration: 4.7, color: "#cbd8e4", glow: "rgba(203, 216, 228, .55)" },
    { x: 31, y: 15, size: 5, driftX: 6, driftY: 5, delay: -4, duration: 6.3, color: "#efc7c4", glow: "rgba(239, 199, 196, .58)" },
    { x: 16, y: 23, size: 7, driftX: 5, driftY: -7, delay: -2, duration: 7.5, color: "#f4dda2", glow: "rgba(244, 221, 162, .72)" },
    { x: 39, y: 31, size: 4, driftX: -6, driftY: -3, delay: -5, duration: 5.4, color: "#d4cae4", glow: "rgba(212, 202, 228, .55)" },
    { x: 8, y: 36, size: 4, driftX: 7, driftY: -4, delay: -3, duration: 6.7, color: "#efc7c4", glow: "rgba(239, 199, 196, .58)" },
  ],
  [
    { x: 7, y: 24, size: 3, driftX: 5, driftY: -6, delay: -2, duration: 5.7, color: "#f4dda2", glow: "rgba(244, 221, 162, .5)" },
    { x: 21, y: 10, size: 5, driftX: 7, driftY: 4, delay: -5, duration: 6.9, color: "#cbd8e4", glow: "rgba(203, 216, 228, .62)" },
    { x: 29, y: 29, size: 8, driftX: -6, driftY: -6, delay: -1, duration: 7.4, color: "#efc7c4", glow: "rgba(239, 199, 196, .72)" },
    { x: 42, y: 18, size: 4, driftX: -5, driftY: 5, delay: -4, duration: 5.3, color: "#f4dda2", glow: "rgba(244, 221, 162, .55)" },
  ],
  [
    { x: 11, y: 8, size: 4, driftX: 7, driftY: 4, delay: -3, duration: 5.2, color: "#d4cae4", glow: "rgba(212, 202, 228, .58)" },
    { x: 25, y: 17, size: 6, driftX: -6, driftY: 6, delay: -1, duration: 6.8, color: "#f4dda2", glow: "rgba(244, 221, 162, .7)" },
    { x: 40, y: 8, size: 3, driftX: -5, driftY: 7, delay: -5, duration: 4.9, color: "#efc7c4", glow: "rgba(239, 199, 196, .55)" },
    { x: 8, y: 34, size: 5, driftX: 6, driftY: -5, delay: -2, duration: 6.1, color: "#cbd8e4", glow: "rgba(203, 216, 228, .62)" },
    { x: 34, y: 35, size: 4, driftX: -7, driftY: -3, delay: -4, duration: 5.8, color: "#f4dda2", glow: "rgba(244, 221, 162, .55)" },
  ],
];
const sparkPalettes = [
  { color: "#fff6d5", glow: "rgba(255, 246, 213, .58)" },
  { color: "#ffe1e7", glow: "rgba(255, 225, 231, .56)" },
  { color: "#e2e8f4", glow: "rgba(226, 232, 244, .56)" },
  { color: "#ffedcc", glow: "rgba(255, 237, 204, .56)" },
  { color: "#f5e1ed", glow: "rgba(245, 225, 237, .56)" },
];

function placementFor(id: string, offset = 0) {
  const seed = [...id].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 17 + offset);
  return { x: 14 + (seed % 70), y: 18 + ((seed >>> 8) % 60) };
}

export default function Landschap() {
  const [kijkAlleen] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("kijk") === "1");
  const [landscape, setLandscape] = useState({ id: "test", name: "Testlandschap" });
  const [visitorLandscapes, setVisitorLandscapes] = useState<Array<{ id: string; name: string }>>([]);
  const [landscapeMenuOpen, setLandscapeMenuOpen] = useState(false);
  const landscapeRef = useRef<HTMLElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initialLandscapeRef = useRef(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [contributions, setContributions] = useState<TestContribution[]>([]);
  const [openContribution, setOpenContribution] = useState<TestContribution | null>(null);
  const [newContributionId, setNewContributionId] = useState("");

  useEffect(() => {
    let mounted = true;
    const loadLandscapeSettings = async () => {
      const response = await fetch("/api/landscapes", { cache: "no-store" });
      const data = await response.json() as { landscapes?: Array<{ id: string; name: string }>; active?: { id: string; name: string } };
      const available = data.landscapes || [];
      const requested = new URLSearchParams(window.location.search).get("landschap");
      const selected = available.find((item) => item.id === requested) || data.active;
      if (!mounted) return;
      if (available.length) setVisitorLandscapes(available);
      if (initialLandscapeRef.current && selected?.id && selected.name) {
        initialLandscapeRef.current = false;
        setLandscape({ id: selected.id, name: selected.name });
      }
    };
    void loadLandscapeSettings().catch(() => undefined);
    const interval = window.setInterval(() => void loadLandscapeSettings().catch(() => undefined), 10_000);
    return () => { mounted = false; window.clearInterval(interval); };
  }, []);

  const configureLandscapeMenu = () => {
    iframeRef.current?.contentWindow?.postMessage({ type: "rouwdier:configure-landscapes", landscapes: visitorLandscapes, selected: landscape.id }, "*");
  };

  useEffect(() => { configureLandscapeMenu(); }, [landscape.id, visitorLandscapes]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("nieuw");
    if (!id) return;
    setNewContributionId(id);
    const timer = window.setTimeout(() => setNewContributionId(""), 5_000);
    return () => window.clearTimeout(timer);
  }, []);

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
    let active = true;
    const load = async () => {
      let local: TestContribution[] = [];
      try { local = JSON.parse(window.localStorage.getItem("rouwdieren-testbijdragen") || "[]") as TestContribution[]; } catch { local = []; }
      try {
        const response = await fetch(`/api/contributions?landschap=${encodeURIComponent(landscape.id)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Nog niet beschikbaar");
        const data = await response.json() as { contributions: LandscapeContribution[] };
        const remote = data.contributions.map((contribution, index) => ({ ...contribution, ...placementFor(contribution.id, index) }));
        if (active) setContributions([...remote, ...local.filter((item) => (item.landscape || "test") === landscape.id && !remote.some((shared) => shared.id === item.id))]);
      } catch {
        if (active) setContributions(local.filter((item) => (item.landscape || "test") === landscape.id));
      }
    };
    void load();
    const interval = window.setInterval(load, 15_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [landscape.id]);

  useEffect(() => {
    const openMakeSpace = (event: MessageEvent) => {
      if (event.data?.type === "rouwdier:open-make" && !kijkAlleen) window.location.assign("/maak");
      if (event.data?.type === "rouwdier:landscape-ready") configureLandscapeMenu();
    };
    window.addEventListener("message", openMakeSpace);
    return () => window.removeEventListener("message", openMakeSpace);
  }, [kijkAlleen, visitorLandscapes]);

  useEffect(() => {
    let typed = "";
    const openBeheer = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
      typed = `${typed}${event.key}`.slice(-6);
      if (typed === "417435") window.location.assign("/beheer");
    };
    window.addEventListener("keydown", openBeheer);
    return () => window.removeEventListener("keydown", openBeheer);
  }, []);

  const selectLandscape = (next: { id: string; name: string }) => {
    const url = new URL(window.location.href);
    url.searchParams.set("landschap", next.id);
    url.searchParams.delete("nieuw");
    window.history.replaceState({}, "", url);
    setOpenContribution(null);
    setNewContributionId("");
    setLandscapeMenuOpen(false);
    setLandscape(next);
  };

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
      <iframe ref={iframeRef} className="landscape-frame" src="/landschap-visual.html?v=landschap-zonder-testbijdragen" title={`Interactief ${landscape.name}`} allow="fullscreen" onLoad={configureLandscapeMenu} />
      <div className="visitor-landscape-control">
        <button type="button" className="visitor-landscape-toggle" aria-label="Open landschappenmenu" aria-expanded={landscapeMenuOpen} onClick={() => setLandscapeMenuOpen((open) => !open)}>
          <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
        </button>
        {landscapeMenuOpen && <div className="visitor-landscape-menu">
          <p>je bent in</p>
          <strong>{landscape.name}</strong>
          {visitorLandscapes.filter((item) => item.id !== landscape.id).length > 0 && <><div className="visitor-menu-divider" /><p>andere landschappen</p>{visitorLandscapes.filter((item) => item.id !== landscape.id).map((item) => <button key={item.id} type="button" onClick={() => selectLandscape(item)}>{item.name}</button>)}</>}
          {!kijkAlleen && <><div className="visitor-menu-divider" />
          <button type="button" className="visitor-make-link" onClick={() => window.location.assign("/maak")}>Wil jij iets toevoegen?</button></>}
        </div>}
      </div>
      {contributions.map((contribution, index) => {
        const particles = sparkShapes[index % sparkShapes.length].slice(0, 2 + index % 2);
        const palette = sparkPalettes[index % sparkPalettes.length];
        const isNew = contribution.id === newContributionId;
        return <button key={contribution.id} type="button" className={`created-rouwdiers-spark created-spark-reis-${index % 5}${isNew ? " is-new" : ""}`} style={{ left: `${contribution.x}%`, top: `${contribution.y}%`, animationDuration: `${68 + index * 5}s`, animationDelay: `-${index * 12}s` }} onClick={() => setOpenContribution(contribution)} aria-label={`${isNew ? "Jouw nieuwe rouwdier: " : "Open "}${contribution.title}`}>{particles.map((particle, particleIndex) => <span key={particleIndex} style={{ "--spark-x": `${20 + (particle.x - 24) * .38}px`, "--spark-y": `${20 + (particle.y - 24) * .38}px`, "--spark-size": `${Math.max(1.5, particle.size * .58)}px`, "--spark-drift-x": `${particle.driftX * .42}px`, "--spark-drift-y": `${particle.driftY * .42}px`, "--spark-delay": `${particle.delay}s`, "--spark-duration": `${particle.duration}s`, "--spark-color": palette.color, "--spark-glow": palette.glow } as CSSProperties} />)}</button>;
      })}
      <button type="button" className="fullscreen-button" aria-label={isFullscreen ? "Sluit schermvullende weergave" : "Open schermvullende weergave"} onClick={toggleFullscreen}>
        <span className="fullscreen-icon" aria-hidden="true" />
      </button>
      {openContribution && <div className="created-contribution-modal" role="dialog" aria-modal="true" aria-label={openContribution.title} onClick={() => setOpenContribution(null)}><section className={`created-contribution-card ${openContribution.motion ? `opened-motion-${openContribution.motion}` : ""}`} onClick={(event) => event.stopPropagation()}><button type="button" className="created-contribution-close" onClick={() => setOpenContribution(null)} aria-label="Sluit rouwdier">×</button><p>{openContribution.kind}</p><h1>{openContribution.title}</h1>{openContribution.aiImage ? <div className="created-contribution-ai-wrap"><img className="created-contribution-ai" src={openContribution.aiImage} alt="AI-versie van de bijdrage" />{openContribution.exactDrawing && openContribution.drawing ? <img className="created-contribution-exact-drawing" src={openContribution.drawing} alt="Oorspronkelijke tekening" /> : (openContribution.images?.[0] || openContribution.drawing) && <img className="created-contribution-source" src={openContribution.images?.[0] || openContribution.drawing} alt="Waar dit rouwdier begon" />}</div> : <>{(openContribution.images?.length ? openContribution.images : openContribution.image ? [openContribution.image] : []).map((image, imageIndex) => <img key={`${imageIndex}-${image.slice(0, 20)}`} src={image} alt="Bijdrage van de bezoeker" />)}{openContribution.drawing && !openContribution.images?.includes(openContribution.drawing) && <img src={openContribution.drawing} alt="Tekening van de bezoeker" />}</>}{openContribution.aiImage && openContribution.images?.slice(1).map((image, imageIndex) => <img key={`${imageIndex}-${image.slice(0, 20)}`} src={image} alt="Extra afbeelding van de bezoeker" />)}{openContribution.audio && <audio className="created-contribution-audio" controls src={openContribution.audio}>Je browser kan deze opname niet afspelen.</audio>}{openContribution.text && openContribution.text !== openContribution.description && <div>{openContribution.text}</div>}{openContribution.description && <div>{openContribution.description}</div>}{openContribution.reference && <div className="created-contribution-reference">{openContribution.reference}</div>}{openContribution.referenceLink && <a className="created-contribution-link" href={openContribution.referenceLink} target="_blank" rel="noreferrer">open verwijzing</a>}</section></div>}
    </main>
  );
}
