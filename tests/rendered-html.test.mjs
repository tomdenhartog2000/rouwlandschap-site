import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { landscapeViewerPath, normaliseLandscapeId, projectExplanationUrl } from "../lib/landscape-links.ts";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("the entry page keeps both ways into the experience open", async () => {
  const page = await source("app/page.tsx");
  assert.match(page, /Misschien heeft wat met je meeleeft al een vorm/);
  assert.match(page, /Leg iets vast of geef het vorm/);
  assert.match(page, /Kijk eerst rond/);
  assert.match(page, /href="\/maak"/);
  assert.match(page, /href="\/verken"/);
  assert.match(page, /href="\/over-ai"/);
});

test("internal navigation uses reliable full-page links without changing QR generation", async () => {
  const paths = ["app/page.tsx", "app/over-ai/page.tsx", "app/over-rouwdieren/page.tsx", "app/maak/page.tsx", "app/beheer/page.tsx"];
  const pages = (await Promise.all(paths.map(source))).join("\n");
  const landscape = await source("components/Landschap.tsx");

  assert.doesNotMatch(pages, /from "next\/link"/);
  assert.match(pages, /<a [^>]*href="\//);
  assert.doesNotMatch(landscape, /useRouter/);
  assert.match(landscape, /window\.location\.assign\("\//);
  assert.match(pages, /import QRCode from "qrcode"/);
  assert.match(pages, /QRCode\.toDataURL/);
});

test("a new contribution starts without a selected input and cannot be shared empty", async () => {
  const page = await source("app/maak/page.tsx");
  assert.match(page, /useState<InputMode\[\]>\(\[\]\)/);
  assert.match(page, /hasShareableContent/);
  assert.match(page, /Voeg eerst iets toe voordat je rouwdier in het landschap kan leven/);
});

test("the server validates shared content and only accepts safe reference links", async () => {
  const route = await source("app/api/contributions/route.ts");
  assert.match(route, /function safeReferenceLink/);
  assert.match(route, /url\.protocol === "https:" \|\| url\.protocol === "http:"/);
  assert.match(route, /Voeg eerst iets toe voordat je rouwdier kan worden gedeeld/);
});

test("local development applies the same migrations as production", async () => {
  const packageJson = await source("package.json");
  const localConfig = await source("wrangler.local.jsonc");
  const baseline = await source("scripts/baseline-local.sql");
  const store = await source("lib/contribution-store.ts");
  assert.match(packageJson, /db:migrate:local/);
  assert.match(packageJson, /db:baseline:local/);
  assert.match(packageJson, /wrangler d1 migrations apply DB --local/);
  assert.match(localConfig, /"migrations_dir": "drizzle"/);
  assert.match(baseline, /pragma_table_info\('contributions'\)/);
  assert.match(baseline, /0007_exhibition_contact\.sql/);
  assert.doesNotMatch(store, /CREATE TABLE|CREATE INDEX|ALTER TABLE|PRAGMA table_info/);
  assert.match(store, /INSERT OR IGNORE INTO landscapes/);
});

test("AI options require clear consent, stay optional, and can be combined", async () => {
  const page = await source("app/maak/page.tsx");
  assert.match(page, /disabled=\{isGenerating \|\| !hasAiConsent\}/);
  assert.match(page, /Ik wil zonder AI verder/);
  assert.match(page, /Je kunt één of meer bewerkingen kiezen/);
  assert.match(page, /current\.includes\(form\) \? current\.filter/);
  assert.doesNotMatch(page, /achtergrond of extra beeldlaag/);
});

test("AI and contribution requests ignore double clicks and stale responses", async () => {
  const makePage = await source("app/maak/page.tsx");
  const contributionRoute = await source("app/api/contributions/route.ts");
  const openAiRequest = await source("lib/openai-request.ts");
  assert.match(makePage, /if \(aiRequestInFlightRef\.current\) return null/);
  assert.match(makePage, /aiAbortControllerRef\.current\?\.abort\(\)/);
  assert.match(makePage, /isCurrentAiRequest\(sequence\)/);
  assert.match(makePage, /\[aiPrompt, feedback, useTranscript, hasAiConsent, step\]/);
  assert.match(makePage, /if \(saveInFlightRef\.current\) return/);
  assert.match(makePage, /submissionRequestIdRef\.current \|\| crypto\.randomUUID\(\)/);
  assert.match(makePage, /"Idempotency-Key": submissionRequestId/);
  assert.match(contributionRoute, /request\.headers\.get\("Idempotency-Key"\)/);
  assert.match(contributionRoute, /where\(eq\(contributions\.id, requestId\)\)/);
  assert.match(openAiRequest, /"Idempotency-Key": idempotencyKey/);
});

test("words-only image generation describes the source accurately", async () => {
  const page = await source("app/maak/page.tsx");
  assert.match(page, /hasVisualInput \? "OpenAI gebruikt je eerste foto of tekening/);
  assert.match(page, /OpenAI gebruikt wat je hebt geschreven of verteld als bron voor een nieuwe beeldversie/);
});

test("AI integrates a drawing as the structural source of one result", async () => {
  const makePage = await source("app/maak/page.tsx");
  const imageRoute = await source("app/api/ai/image/route.ts");
  const landscape = await source("components/Landschap.tsx");
  assert.match(makePage, /aiPath === "translate" && sourceVisualChoice === "with-source"/);
  assert.match(makePage, /OriginalVisualPreview/);
  assert.match(makePage, /photos\[0\]\?\.dataUrl \|\| drawingDataUrl/);
  assert.doesNotMatch(makePage, /card-exact-drawing/);
  assert.match(imageRoute, /images\/edits/);
  assert.match(imageRoute, /one integrated co-created image/);
  assert.match(imageRoute, /drawn line is the essential structural source/);
  assert.match(imageRoute, /smooth uneven strokes/);
  assert.match(imageRoute, /Apply exactly and only/);
  assert.match(imageRoute, /context && !isConstrainedEdit/);
  assert.doesNotMatch(imageRoute, /Add a subtle abstract background or surrounding layer/);
  assert.doesNotMatch(imageRoute, /displayed separately/);
  assert.match(landscape, /created-contribution-originals/);
});

test("co-creation requires and obeys an explicit visual edit request", async () => {
  const makePage = await source("app/maak/page.tsx");
  const imageRoute = await source("app/api/ai/image/route.ts");
  assert.match(makePage, /requiresConstrainedImageDirection/);
  assert.match(makePage, /requiresConstrainedImageDirection && !aiPrompt\.trim\(\)/);
  assert.match(makePage, /requiresConstrainedImageDirection \? "" : \[words, reference, careReflection/);
  assert.match(makePage, /AI verandert alleen wat jij noemt/);
  assert.match(imageRoute, /isConstrainedEdit && !direction && !baseDirection/);
  assert.match(imageRoute, /Do not add any new object/);
  assert.match(imageRoute, /colour or background change is not permission to add decorative content/);
});

test("translation can freely reinterpret drawings, including sound drawings", async () => {
  const makePage = await source("app/maak/page.tsx");
  const imageRoute = await source("app/api/ai/image/route.ts");
  assert.match(makePage, /modes\.includes\("sounddraw"\) \? "sounddrawing" : "drawing"/);
  assert.match(imageRoute, /sourceKind === "drawing" \|\| sourceKind === "sounddrawing"/);
  assert.match(imageRoute, /sound-drawing as a visual trace of movement, rhythm, and sound/);
  assert.match(imageRoute, /not as a contour that must be preserved/);
  assert.match(imageRoute, /visually developed and expressive/);
  assert.match(imageRoute, /you may introduce new visual elements/);
});

test("changing an AI image builds on it while looking again restarts from the original", async () => {
  const page = await source("app/maak/page.tsx");
  assert.match(page, /type AiImageRequest = "initial" \| "adjust" \| "again"/);
  assert.match(page, /request === "adjust" && aiImageDataUrl \? aiImageDataUrl : originalSource/);
  assert.match(page, /data\.set\("baseDirection", ""\)/);
  assert.match(page, /data\.set\("revision", String\(request === "adjust"\)\)/);
  assert.match(page, /feedbackDirection === "again" \? "again" : "adjust"/);
  assert.match(page, /We beginnen bij je oorspronkelijke bijdrage/);
  const imageRoute = await source("app/api/ai/image/route.ts");
  assert.match(imageRoute, /isRevision \? "Treat the supplied image as the current AI result/);
});

test("removing an input mode also removes the contribution behind it", async () => {
  const page = await source("app/maak/page.tsx");
  assert.match(page, /if \(mode === "write"\) setWords\(""\)/);
  assert.match(page, /setPhotos\(\[\]\)/);
  assert.match(page, /setAudioUrl\(""\)/);
  assert.match(page, /setReference\(""\)/);
  assert.match(page, /setDrawingDataUrl\(""\)/);
});

test("a single drawing tap becomes visible and a blank canvas is not saved", async () => {
  const page = await source("app/maak/page.tsx");
  assert.match(page, /context\.arc\(point\.x, point\.y/);
  assert.match(page, /drawingHasMarksRef\.current = true/);
  assert.match(page, /canvasRef\.current && drawingHasMarksRef\.current/);
});

test("references are normalised, validated and remain visible on the card", async () => {
  const page = await source("app/maak/page.tsx");
  assert.match(page, /function normaliseReferenceLink/);
  assert.match(page, /const validReferenceLink = normaliseReferenceLink\(referenceLink\)/);
  assert.match(page, /card-reference/);
  assert.match(page, /data\.set\("referenceLink", validReferenceLink\)/);
});

test("motion AI accepts a visual contribution without requiring words", async () => {
  const page = await source("app/maak/page.tsx");
  const route = await source("app/api/ai/text/route.ts");
  assert.match(page, /mode: "motion", direction,[^\n]+hasVisualInput/);
  assert.match(route, /direction \|\| data\.hasVisualInput/);
  assert.match(route, /Er is een visuele bijdrage/);
});

test("the card does not duplicate writing and keeps the reflection editable", async () => {
  const page = await source("app/maak/page.tsx");
  assert.doesNotMatch(page, /titleSuggestion/);
  assert.match(page, /descriptionSuggestion = careReflection\.trim\(\)/);
  assert.match(page, /data\.set\("description", visibleDescription\)/);
});

test("sound drawing only offers instrument sounds", async () => {
  const page = await source("app/maak/page.tsx");
  assert.doesNotMatch(page, /eenvoudige toon/);
  assert.doesNotMatch(page, /"synth"/);
  assert.match(page, /title: "strijkers"/);
});

test("the sound and AI boundary is explicit and a sound-only drawing has no dead-end AI route", async () => {
  const makePage = await source("app/maak/page.tsx");
  const aiPage = await source("app/over-ai/page.tsx");
  assert.match(makePage, /AI luistert niet naar deze klank/);
  assert.match(makePage, /AI kan alleen gesproken woorden gebruiken/);
  assert.match(makePage, /AI gebruikt losse geluiden niet voor het beeld/);
  assert.match(makePage, /disabled=\{!canUseAi\}/);
  assert.match(makePage, /Bewaar ook het tekenbeeld of voeg woorden of een foto toe/);
  assert.match(aiPage, /AI interpreteert geen losse geluiden, stemklank of omgevingsgeluid/);
  assert.match(aiPage, /bij een klanktekening luistert AI niet naar de gemaakte klank/);
});

test("audio remains attached when an AI image is shared", async () => {
  const page = await source("app/maak/page.tsx");
  assert.match(page, /const audioFileToShare = sonificationFileRef\.current \|\| audioFileRef\.current/);
  assert.match(page, /if \(audioFileToShare\) data\.set\("audio", audioFileToShare\)/);
  assert.doesNotMatch(page, /!hasAiEndProduct && \(sonificationFileRef\.current \|\| audioFileRef\.current\)/);
});

test("the graduation exhibition landscape is visible but does not become active", async () => {
  const store = await source("lib/contribution-store.ts");
  const migration = await source("drizzle/0008_graduation_exhibition_landscape.sql");
  assert.match(store, /'afstudeerexpositie', 'Landschap van de afstudeerexpositie', 0, 1, 4/);
  assert.match(store, /'Landschap van de expositie', 0, 1, 3/);
  assert.match(migration, /'afstudeerexpositie', 'Landschap van de afstudeerexpositie', 0, 1, 4/);
  assert.match(migration, /CASE WHEN id = 'expositie' THEN 1 ELSE 0 END/);
});

test("the old landscape path redirects to the single visitor experience", async () => {
  const oldRoute = await source("app/landschap/page.tsx");
  const visitorRoute = await source("app/verken/page.tsx");
  assert.match(oldRoute, /redirect\("\/verken"\)/);
  assert.match(visitorRoute, /components\/Landschap/);
});

test("the fixed exhibition starts anonymously without flashing the test landscape", async () => {
  const exhibition = await source("lib/rouwdieren-expositie.ts");
  const store = await source("lib/contribution-store.ts");
  const landscape = await source("components/Landschap.tsx");
  assert.doesNotMatch(exhibition, /participant:/);
  assert.equal((exhibition.match(/\{ id: "/g) ?? []).length, 18);
  assert.match(exhibition, /title: "Regenboog"/);
  assert.match(exhibition, /title: "Boswezen"/);
  assert.match(exhibition, /id: "house-on-a-star"[^\n]+status: "hidden"/);
  assert.match(exhibition, /Op de uitvaart werd een nummer over de regenboog gedraaid/);
  assert.doesNotMatch(exhibition, /title: "(?:Rainbow|Forest creature|White butterfly)"/);
  assert.match(store, /ON CONFLICT\(id\) DO UPDATE SET\s+title = excluded\.title,\s+description = excluded\.description,\s+text_value = excluded\.text_value/);
  assert.match(store, /status = CASE WHEN excluded\.status = 'hidden' THEN 'hidden' ELSE contributions\.status END/);
  assert.match(store, /item\.title,\s+"",\s+item\.text/);
  assert.match(landscape, /useState\(\{ id: "", name: "" \}\)/);
});

test("look-only mode hides every way to add a contribution", async () => {
  const landscape = await source("components/Landschap.tsx");
  const visual = await source("public/landschap-visual.html");
  assert.match(landscape, /canAdd: !kijkAlleen/);
  assert.match(visual, /\.hidden = event\.data\.canAdd === false/);
});

test("motion consent stays concise and moderation names the exhibition designer", async () => {
  const makePage = await source("app/maak/page.tsx");
  const aiPage = await source("app/over-ai/page.tsx");
  assert.match(makePage, /Ik geef toestemming voor deze AI-bewerking/);
  assert.doesNotMatch(makePage, /mijn woorden tijdelijk naar OpenAI gaan/);
  assert.match(aiPage, /De ontwerper van de tentoonstelling beheert de bijdragen/);
  assert.match(aiPage, /bijvoorbeeld wanneer ze ongepast zijn/);
});

test("a title is valid content and photo selection is limited to five", async () => {
  const page = await source("app/maak/page.tsx");
  const route = await source("app/api/contributions/route.ts");
  assert.match(page, /const MAX_PHOTOS = 5/);
  assert.match(page, /maximaal \$\{MAX_PHOTOS\} foto/);
  assert.match(route, /!providedTitle/);
});

test("exhibition sharing supports contact or an anonymous designer follow-up", async () => {
  const makePage = await source("app/maak/page.tsx");
  const route = await source("app/api/contributions/route.ts");
  const adminRoute = await source("app/api/admin/contributions/route.ts");
  const adminPage = await source("app/beheer/page.tsx");
  const schema = await source("db/schema.ts");
  const migration = await source("drizzle/0007_exhibition_contact.sql");
  const publicMapper = route.slice(route.indexOf("function toLandscapeContribution"), route.indexOf("export async function GET"));

  assert.match(makePage, /sharing === "here" \|\| sharing === "future"/);
  assert.match(makePage, /Ik wil het samen vormgeven/);
  assert.match(makePage, /Ik wil eerst een voorstel ontvangen/);
  assert.match(makePage, /Ik wil anoniem blijven/);
  assert.match(makePage, /exhibitionProcess === "designer"/);
  assert.match(makePage, /type="email"/);
  assert.match(makePage, /needsExhibitionContact && \(!validContactEmail \|\| !contactPermission\)/);
  assert.match(makePage, /data\.set\("contactPermission", String\(contactPermission\)\)/);
  assert.match(route, /requestedExhibitionProcess === "designer"/);
  assert.match(route, /needsExhibitionFollowUp && !exhibitionProcess/);
  assert.match(route, /needsExhibitionContact && \(!contactEmail \|\| !hasContactPermission\)/);
  assert.ok(route.indexOf("needsExhibitionContact &&") < route.indexOf("UPLOADS.put"));
  assert.match(route, /contactEmail: needsExhibitionContact \? contactEmail : ""/);
  assert.match(route, /contactConsentAt: needsExhibitionContact \? now : 0/);
  assert.doesNotMatch(publicMapper, /contactEmail|contactConsentAt|exhibitionProcess/);
  assert.match(adminRoute, /row\.exhibitionProcess === "designer"/);
  assert.match(adminRoute, /contactEmail: row\.contactEmail/);
  assert.match(adminPage, /Ontwerper mag het zonder contact verder vormgeven/);
  assert.match(adminPage, /mailto:/);
  assert.match(schema, /contactEmail: text\("contact_email"\)/);
  assert.match(migration, /ADD COLUMN contact_email/);
});

test("the card QR first opens the explanation page and says visitors can look around", async () => {
  const makePage = await source("app/maak/page.tsx");
  const explanationPage = await source("app/over-rouwdieren/page.tsx");
  assert.match(makePage, /Meer weten over rouwdieren\?/);
  assert.match(makePage, /Scan de QR-code en kijk eventueel rond/);
  assert.match(makePage, /tussen die van anderen\./);
  assert.match(makePage, /projectExplanationUrl\(window\.location\.origin, qrLandscapeId\)/);
  assert.match(makePage, /savedContributionLandscapeId \|\| \(hasLoadedLandscape \? landscape\.id : ""\)/);
  assert.match(makePage, /setSavedContributionLandscapeId\(result\.contribution\?\.landscape \|\| ""\)/);
  assert.match(explanationPage, /landscapeViewerPath\(landscapeId\)/);
});

test("landscape-aware card links preserve a valid place and safely ignore invalid input", () => {
  assert.equal(normaliseLandscapeId(["expositie", "test"]), "expositie");
  assert.equal(projectExplanationUrl("https://voorbeeld.nl/maak", "expositie"), "https://voorbeeld.nl/over-rouwdieren?landschap=expositie");
  assert.equal(landscapeViewerPath("expositie"), "/verken?kijk=1&landschap=expositie");
  assert.equal(landscapeViewerPath(""), "/verken?kijk=1");
  assert.equal(landscapeViewerPath("<script>"), "/verken?kijk=1");
});

test("downloaded cards keep the complete body text", async () => {
  const makePage = await source("app/maak/page.tsx");
  assert.match(makePage, /Er is niets gedeeld\./);
  assert.match(makePage, /Bewaar je rouwdier als je het wilt meenemen\./);
  assert.match(makePage, /const bodyLines = bodyText \? wrapCanvasText\(context, bodyText, contentWidth\) : \[\]/);
  assert.doesNotMatch(makePage, /const bodyLines =[^\n]*slice\(0, 10\)/);
  assert.match(makePage, /bodyLines\.length \* 26/);
});

test("admin groups contributions by landscape and can rename a landscape", async () => {
  const adminPage = await source("app/beheer/page.tsx");
  const landscapeRoute = await source("app/api/admin/landscapes/route.ts");
  assert.match(adminPage, /Rouwdieren per landschap/);
  assert.match(adminPage, /className="admin-contribution-group"/);
  assert.match(adminPage, /landscape\.items\.map\(renderItem\)/);
  assert.match(adminPage, /renameLandscape/);
  assert.match(adminPage, /JSON\.stringify\(\{ id, name \}\)/);
  assert.match(adminPage, /editingLandscapeId === landscape\.id/);
  assert.match(adminPage, /aria-label=\{`Bewerk naam van/);
  assert.match(adminPage, />✎<\/button>/);
  assert.match(adminPage, /annuleren/);
  assert.match(landscapeRoute, /nextName\.length > 80/);
  assert.match(landscapeRoute, /set\(\{ name: nextName \}\)/);
});
