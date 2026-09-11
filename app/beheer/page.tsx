"use client";

import { useEffect, useMemo, useState } from "react";

type Attachment = { name: string; type: string; role: "photo" | "drawing" | "audio" | "ai"; url: string };
type ManagedContribution = { id: string; title: string; description: string; kind: string; text: string; reference: string; referenceLink: string; landscape: string; sharing: "online" | "here" | "future"; exhibitionProcess: "" | "co-creation" | "proposal" | "designer"; contactEmail: string; contactConsentAt: number; status: "visible" | "hidden"; createdAt: number; attachments: Attachment[] };
type ManagedLandscape = { id: string; name: string; active: number; visible: number };

export default function Beheer() {
  const [password, setPassword] = useState("");
  const [items, setItems] = useState<ManagedContribution[] | null>(null);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [landscapes, setLandscapes] = useState<ManagedLandscape[]>([]);
  const [landscapeNames, setLandscapeNames] = useState<Record<string, string>>({});

  const load = async () => {
    const response = await fetch("/api/admin/contributions", { cache: "no-store" });
    if (!response.ok) { setItems(null); return; }
    const data = await response.json() as { contributions: ManagedContribution[] };
    setItems(data.contributions);
    const landscapeResponse = await fetch("/api/admin/landscapes", { cache: "no-store" });
    if (landscapeResponse.ok) {
      const nextLandscapes = (await landscapeResponse.json() as { landscapes: ManagedLandscape[] }).landscapes;
      setLandscapes(nextLandscapes);
      setLandscapeNames(Object.fromEntries(nextLandscapes.map((landscape) => [landscape.id, landscape.name])));
    }
  };

  useEffect(() => { void load(); }, []);

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (!response.ok) { const data = await response.json() as { error?: string }; setMessage(data.error || "Inloggen lukt niet."); return; }
    setPassword("");
    await load();
  };

  const update = async (id: string, action: "toggle" | "delete") => {
    const item = items?.find((candidate) => candidate.id === id);
    if (!item) return;
    if (action === "delete" && !window.confirm(`Verwijder “${item.title}” definitief?`)) return;
    setBusyId(id);
    const response = await fetch(`/api/admin/contributions/${id}`, action === "delete" ? { method: "DELETE" } : { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: item.status === "visible" ? "hidden" : "visible" }) });
    setBusyId("");
    if (!response.ok) { setMessage("Deze wijziging kon niet worden opgeslagen."); return; }
    await load();
  };

  const activateLandscape = async (id: string) => {
    const response = await fetch("/api/admin/landscapes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (!response.ok) { setMessage("Dit landschap kon niet worden ingesteld."); return; }
    await load();
  };

  const setLandscapeVisibility = async (id: string, visible: boolean) => {
    const response = await fetch("/api/admin/landscapes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, visible }) });
    if (!response.ok) { setMessage("Deze zichtbaarheid kon niet worden ingesteld."); return; }
    await load();
  };

  const renameLandscape = async (event: React.FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    const name = landscapeNames[id]?.trim() ?? "";
    if (!name) { setMessage("Een landschap heeft een naam nodig."); return; }
    setBusyId(`landscape:${id}`);
    const response = await fetch("/api/admin/landscapes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, name }) });
    setBusyId("");
    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string } | null;
      setMessage(data?.error || "De naam kon niet worden opgeslagen.");
      return;
    }
    setMessage("");
    await load();
  };

  const groupedLandscapes = useMemo(() => {
    if (!items) return [];
    const knownIds = new Set(landscapes.map((landscape) => landscape.id));
    const groups = landscapes.map((landscape) => ({ ...landscape, items: items.filter((item) => item.landscape === landscape.id) }));
    const unknownIds = Array.from(new Set(items.filter((item) => !knownIds.has(item.landscape)).map((item) => item.landscape)));
    return [...groups, ...unknownIds.map((id) => ({ id, name: id, active: 0, visible: 0, items: items.filter((item) => item.landscape === id) }))];
  }, [items, landscapes]);

  const renderItem = (item: ManagedContribution) => (
    <article key={item.id} className={`admin-item ${item.status === "hidden" ? "is-hidden" : ""}`}>
      <div className="admin-item-head">
        <div>
          <p>{item.kind} · {item.status === "visible" ? "zichtbaar" : "verborgen"}</p>
          <h3>{item.title}</h3>
          <p className="admin-sharing">{item.sharing === "future" ? "online en andere plekken toegestaan" : item.sharing === "here" ? "online en deze opstelling toegestaan" : "alleen online landschap toegestaan"}</p>
          {item.exhibitionProcess && <div className="admin-contact"><p>{item.exhibitionProcess === "co-creation" ? "Wil samen vormgeven met begeleiding" : item.exhibitionProcess === "proposal" ? "Wil eerst een voorstel ontvangen" : "Ontwerper mag het zonder contact verder vormgeven"}</p>{item.contactEmail && <a href={`mailto:${item.contactEmail}`}>{item.contactEmail}</a>}</div>}
        </div>
        <div className="admin-actions">
          <button type="button" className="secondary-button" disabled={busyId === item.id} onClick={() => void update(item.id, "toggle")}>{item.status === "visible" ? "verberg" : "maak zichtbaar"}</button>
          <button type="button" className="quiet-button admin-delete" disabled={busyId === item.id} onClick={() => void update(item.id, "delete")}>verwijder</button>
        </div>
      </div>
      {item.attachments.filter((attachment) => attachment.role !== "audio").map((attachment) => <img key={attachment.name} src={attachment.url} alt="Bijdrage van de bezoeker" />)}
      {item.attachments.filter((attachment) => attachment.role === "audio").map((attachment) => <audio key={attachment.name} controls src={attachment.url}>Je browser kan deze opname niet afspelen.</audio>)}
      {item.text && <p className="admin-text">{item.text}</p>}
      {item.description && item.description !== item.text && <p className="admin-text">{item.description}</p>}
      {item.reference && <p className="admin-reference">{item.reference}</p>}
      {item.referenceLink && <a href={item.referenceLink} target="_blank" rel="noreferrer">open verwijzing</a>}
    </article>
  );

  if (!items) return <main className="admin-page"><section className="admin-login"><p className="eyebrow">beheer</p><h1>Beheer het online landschap</h1><p>Alleen jij kunt hier rouwdieren verbergen of verwijderen.</p><form onSubmit={login}><label>toegangscode<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label><button className="primary-button">open beheer</button></form>{message && <p className="admin-message">{message}</p>}<a href="/verken" className="quiet-button">terug naar het landschap</a></section></main>;

  return <main className="admin-page"><section className="admin-shell">
    <header><div><p className="eyebrow">beheer</p><h1>Rouwdieren in het online landschap</h1><p>{items.length === 1 ? "1 rouwdier" : `${items.length} rouwdieren`}</p></div><a href="/verken" className="quiet-button">bekijk landschap</a></header>
    {message && <p className="admin-message">{message}</p>}
    <section className="admin-landscapes"><h2>Landschappen</h2><p>Nieuwe rouwdieren worden aan het huidige landschap toegevoegd. Alleen zichtbare landschappen staan in het menu voor bezoekers.</p>{landscapes.map((landscape) => {
      const changedName = (landscapeNames[landscape.id] ?? "").trim();
      return <article key={landscape.id} className="admin-landscape">
        <div><strong>{landscape.name}</strong><span>{landscape.active ? "huidig landschap" : ""}</span></div>
        <div className="admin-landscape-settings">
          <form className="admin-landscape-rename" onSubmit={(event) => void renameLandscape(event, landscape.id)}><label htmlFor={`landscape-name-${landscape.id}`}>naam</label><input id={`landscape-name-${landscape.id}`} type="text" maxLength={80} value={landscapeNames[landscape.id] ?? landscape.name} onChange={(event) => setLandscapeNames((current) => ({ ...current, [landscape.id]: event.target.value }))} /><button type="submit" className="secondary-button" disabled={busyId === `landscape:${landscape.id}` || !changedName || changedName === landscape.name}>naam opslaan</button></form>
          <div className="admin-actions"><button type="button" className={landscape.active ? "is-selected" : "secondary-button"} disabled={Boolean(landscape.active)} onClick={() => void activateLandscape(landscape.id)}>{landscape.active ? "huidig" : "maak huidig"}</button><label><input type="checkbox" checked={Boolean(landscape.visible)} onChange={(event) => void setLandscapeVisibility(landscape.id, event.target.checked)} /> zichtbaar in het bezoekersmenu</label></div>
        </div>
      </article>;
    })}</section>
    <section className="admin-contribution-groups"><h2>Rouwdieren per landschap</h2>{groupedLandscapes.map((landscape) => <details key={landscape.id} className="admin-contribution-group" defaultOpen={Boolean(landscape.active)}><summary><span>{landscape.name}</span><small>{landscape.items.length === 1 ? "1 rouwdier" : `${landscape.items.length} rouwdieren`}</small></summary><div className="admin-list">{landscape.items.length === 0 ? <p className="admin-empty">Er zijn nog geen rouwdieren in dit landschap.</p> : landscape.items.map(renderItem)}</div></details>)}</section>
  </section></main>;
}
