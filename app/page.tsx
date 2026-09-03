export default function Home() {
  return (
    <main className="entry-page">
      <section className="entry-card">
        <h1>Rouwdieren</h1>
        <p className="entry-question">Heb je al iets dat met je meeleeft, of wil je hier iets vormgeven?</p>
        <p className="entry-participation">Je kunt iets voor jezelf maken en bewaren. Alleen als je aan het eind kiest om het online te delen, wordt het bewaard en kunnen bezoekers het openen. Bij het vormgeven kun je AI gebruiken, als je dat wilt. <a href="/over-ai">over AI en je bijdrage</a></p>
        <a className="primary-button link-button" href="/maak">maak een rouwdier</a>
        <a className="entry-landscape-link" href="/verken">of kijk eerst rond in het online landschap</a>
      </section>
    </main>
  );
}
