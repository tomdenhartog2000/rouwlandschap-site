import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

test("AI options require clear consent, stay optional, and can be combined", async () => {
  const page = await source("app/maak/page.tsx");
  assert.match(page, /disabled=\{isGenerating \|\| !hasAiConsent\}/);
  assert.match(page, /Ik wil zonder AI verder/);
  assert.match(page, /Je kunt één of meer bewerkingen kiezen/);
  assert.match(page, /current\.includes\(form\) \? current\.filter/);
  assert.doesNotMatch(page, /achtergrond of extra beeldlaag/);
});

test("AI keeps originals separate and uses a drawing as its structural source", async () => {
  const makePage = await source("app/maak/page.tsx");
  const imageRoute = await source("app/api/ai/image/route.ts");
  const landscape = await source("components/Landschap.tsx");
  assert.match(makePage, /keepsOriginalVisuals/);
  assert.match(makePage, /OriginalVisualPreview/);
  assert.doesNotMatch(makePage, /card-exact-drawing/);
  assert.match(imageRoute, /structural source/);
  assert.match(imageRoute, /smooth uneven strokes/);
  assert.match(imageRoute, /original contribution is preserved and displayed separately/);
  assert.match(landscape, /created-contribution-originals/);
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
  assert.match(page, /hasVisualInput \}\) \}\)/);
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

test("the old landscape path redirects to the single visitor experience", async () => {
  const oldRoute = await source("app/landschap/page.tsx");
  const visitorRoute = await source("app/verken/page.tsx");
  assert.match(oldRoute, /redirect\("\/verken"\)/);
  assert.match(visitorRoute, /components\/Landschap/);
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
