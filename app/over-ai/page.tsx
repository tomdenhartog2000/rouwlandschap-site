export default function OverAi() {
  return (
    <main className="information-page">
      <article className="information-card">
        <a className="back-link" href="/">terug</a>
        <p className="eyebrow">over AI en je bijdrage</p>
        <h1>Wat deelname betekent</h1>
        <p className="information-lead">Je kiest zelf wat je maakt, wat je bewaart en of je iets deelt. Je bent vrij om niets te delen.</p>

        <section>
          <h2>Als je iets deelt</h2>
          <p>Alleen wanneer je aan het eind kiest dat je rouwdier online, bij deze opstelling of op andere plekken mag leven, wordt het online bewaard. Andere bezoekers kunnen het dan in het online landschap openen. Kies je om het mee te nemen, dan wordt er niets opgeslagen.</p>
          <p>Dat kan een foto, tekening, tekst, geluidsopname, verwijzing, titel of toelichting zijn. Deel daarom alleen wat je ook aan bezoekers wilt laten zien. Je naam wordt niet gevraagd, maar een bijdrage kan natuurlijk wel herkenbare informatie bevatten.</p>
          <p>Kies je voor een opstelling of een andere plek, dan kun je een e-mailadres achterlaten zodat de ontwerper contact met je kan opnemen. Dat adres is alleen zichtbaar in het beveiligde beheer, wordt alleen voor die samenwerking gebruikt en verschijnt niet in het landschap of op je kaartje.</p>
          <p>De bijdrage blijft bewaard als onderdeel van dit project. De ontwerper van de tentoonstelling beheert de bijdragen en kan ze verbergen of verwijderen, bijvoorbeeld wanneer ze ongepast zijn.</p>
        </section>

        <section>
          <h2>Als je AI gebruikt</h2>
          <p>AI is een optie, geen vereiste. Je kunt zelf iets maken, samen met AI verder werken, of AI vragen jouw input naar een andere vorm te vertalen.</p>
          <p>Alleen wanneer je hiervoor kiest en de toestemming aanvinkt, gaan de invoer die je voor de AI-versie kiest en je aanwijzing tijdelijk naar OpenAI. OpenAI maakt daarmee een beeldvoorstel, ordent je eigen woorden of kiest een rustige beweging.</p>
          <p>Een geluidsopname kan zelfstandig als rouwdier blijven bestaan. Wil je gesproken woorden uit een opname voor een beeld gebruiken, dan geef je daar apart toestemming voor: alleen die woorden worden eenmalig omgezet naar tekst. AI interpreteert geen losse geluiden, stemklank of omgevingsgeluid. Ook bij een klanktekening luistert AI niet naar de gemaakte klank; alleen wanneer je het tekenbeeld bewaart, kan dat beeld als visueel uitgangspunt dienen.</p>
          <p>De bijdrage die je met AI maakt blijft van jou. Je kunt de AI-versie aanpassen, niet gebruiken, of zonder AI verdergaan.</p>
        </section>

        <section>
          <h2>Waar het wordt bewaard</h2>
          <p>Het online landschap draait als ChatGPT Site. Gedeelde bijdragen worden opgeslagen in de database en bestandsopslag van dit project, zodat ze in het landschap kunnen verschijnen en eventueel bij een opstelling kunnen worden overwogen.</p>
          <p>Invoer die via de OpenAI API wordt gebruikt, wordt niet gebruikt om OpenAI-modellen te trainen, tenzij daar afzonderlijk voor is gekozen. OpenAI kan die invoer wel tijdelijk bewaren voor misbruikmonitoring.</p>
        </section>

        <p className="information-source">Meer over hoe OpenAI met API-gegevens omgaat: <a href="https://platform.openai.com/docs/models/default-usage-policies-by-endpoint" target="_blank" rel="noreferrer">OpenAI Docs</a>.</p>
      </article>
    </main>
  );
}
