import Link from "next/link";

export default function Home() {
  return (
    <main className="entry-page">
      <section className="entry-card">
        <h1>Rouwdieren</h1>
        <p className="entry-question">Misschien heeft wat met je meeleeft al een vorm. Misschien krijgt het hier voor het eerst vorm.</p>
        <p className="entry-participation">Je kunt iets voor jezelf maken; aan het eind kies je pas of je iets achterlaat. <Link href="/over-ai">over AI en je bijdrage</Link></p>
        <Link className="primary-button link-button" href="/maak">Leg iets vast of geef het vorm</Link>
        <Link className="entry-landscape-link" href="/verken">Kijk eerst rond</Link>
      </section>
    </main>
  );
}
