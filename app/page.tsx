export default function Home() {
  return (
    <main className="entry-page">
      <section className="entry-card">
        <h1>Een rouwdier kan allerlei vormen aannemen.</h1>
        <p>Heb je al iets dat je wilt achterlaten, of wil je hier iets vormgeven?</p>
        <a className="primary-button link-button" href="/maak">maak een rouwdier</a>
        <a className="entry-landscape-link" href="/verken">of kijk eerst rond in het online landschap</a>
        <p className="entry-participation">Deelnemen is vrijwillig. Je kunt iets voor jezelf maken en bewaren. Alleen als je aan het eind kiest om het online te delen, wordt het bewaard en kunnen bezoekers het openen.</p>
        <a className="entry-ai-link" href="/over-ai">over AI en je bijdrage</a>
      </section>
    </main>
  );
}
