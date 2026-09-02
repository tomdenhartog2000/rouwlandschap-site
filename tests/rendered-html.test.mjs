import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("the entry page keeps both ways into the experience open", async () => {
  const page = await source("app/page.tsx");
  assert.match(page, /Heb je al iets dat met je meeleeft/);
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

test("a drawing stays an exact layer when AI adds to it", async () => {
  const makePage = await source("app/maak/page.tsx");
  const imageRoute = await source("app/api/ai/image/route.ts");
  const landscape = await source("app/landschap/page.tsx");
  assert.match(makePage, /keepDrawingExact/);
  assert.match(makePage, /card-exact-drawing/);
  assert.match(imageRoute, /Return the surrounding layer or background only/);
  assert.match(landscape, /created-contribution-exact-drawing/);
});
