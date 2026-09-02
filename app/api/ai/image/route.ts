import { env } from "cloudflare:workers";
import { ensureContributionStore } from "@/lib/contribution-store";

type OpenAiEnv = { OPENAI_API_KEY?: string; DB: D1Database };

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const DAILY_IMAGE_LIMIT = 100;

export async function POST(request: Request) {
  const apiKey = (env as unknown as OpenAiEnv).OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "De beeldfunctie is nog niet ingesteld." }, { status: 503 });

  try {
    await ensureContributionStore();
    const database = (env as unknown as OpenAiEnv).DB;
    const since = Date.now() - 1000 * 60 * 60 * 24;
    const count = await database.prepare("SELECT COUNT(*) AS count FROM ai_generations WHERE created_at >= ?").bind(since).first<{ count: number }>();
    if ((count?.count ?? 0) >= DAILY_IMAGE_LIMIT) return Response.json({ error: "Er zijn vandaag al veel beeldvoorstellen gemaakt. Probeer het morgen opnieuw." }, { status: 429 });
    await database.prepare("INSERT INTO ai_generations (id, created_at) VALUES (?, ?)").bind(crypto.randomUUID(), Date.now()).run();
    const incoming = await request.formData();
    const direction = typeof incoming.get("direction") === "string" ? String(incoming.get("direction")).trim().slice(0, 1_200) : "";
    const baseDirection = typeof incoming.get("baseDirection") === "string" ? String(incoming.get("baseDirection")).trim().slice(0, 1_200) : "";
    const isRevision = incoming.get("revision") === "true";
    const keepDrawingExact = incoming.get("keepDrawingExact") === "true";
    const aiPath = incoming.get("aiPath") === "together" ? "together" : "translate";
    const context = typeof incoming.get("context") === "string" ? String(incoming.get("context")).trim().slice(0, 2_000) : "";
    const source = incoming.get("source");
    const sourceFile = source instanceof File && source.size ? source : null;
    if (sourceFile && (!sourceFile.type.startsWith("image/") || sourceFile.size > MAX_IMAGE_BYTES)) return Response.json({ error: "Deze afbeelding kan niet worden gebruikt." }, { status: 400 });

    const prompt = [
      "Create one quiet visual addition for a participatory art project about living with loss.",
      keepDrawingExact ? "Use the supplied drawing only to understand where a quiet surrounding layer belongs. Return the surrounding layer or background only. Do not reproduce, redraw, cover, crop, recolour, resize, or include the visitor's drawing. It will be placed unchanged on top afterwards." : aiPath === "together" && isRevision && sourceFile ? "Treat the supplied image as an earlier co-created result. Preserve the visitor's drawing or photo and every element that the visitor does not explicitly ask to change. Change only the requested part." : aiPath === "together" && sourceFile ? "Keep the visitor's original drawing or photo clearly recognisable and present as the foreground. Do not redraw, crop, recolour, resize, cover, or replace it. Add only the requested element around or behind it." : sourceFile ? "Use the supplied drawing or photo as source material. Create a fully developed new visual interpretation from it. It may be freely expanded, transformed, and re-composed while remaining connected to the original." : "Make a visual starting point from the visitor's words without illustrating them literally.",
      "Use restrained, natural colours and a simple composition. Do not add text, letters, names, faces, people, religious symbols, memorial symbols, flames, sparkles, dramatic light, logos, or watermarks.",
      baseDirection ? `The visitor's original request: ${baseDirection}` : "",
      isRevision && direction ? `The visitor now wants this change: ${direction}` : direction ? `The visitor asks: ${direction}` : aiPath === "together" ? "Add a subtle abstract background or surrounding layer." : "Make a quiet visual interpretation.",
      context ? `Visitor context: ${context}` : "",
    ].filter(Boolean).join("\n");

    const endpoint = sourceFile ? "https://api.openai.com/v1/images/edits" : "https://api.openai.com/v1/images/generations";
    const response = sourceFile
      ? await (() => {
        const body = new FormData();
        body.set("model", "gpt-image-1-mini");
        body.set("prompt", prompt);
        body.set("size", "1024x1024");
        body.set("quality", "low");
        body.set("output_format", "png");
        body.set("image", sourceFile);
        return fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body });
      })()
      : await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-image-1-mini", prompt, size: "1024x1024", quality: "low", output_format: "png" }),
      });
    const result = await response.json() as { data?: Array<{ b64_json?: string }>; error?: { message?: string } };
    const image = result.data?.[0]?.b64_json;
    if (!response.ok || !image) return Response.json({ error: result.error?.message || "Het beeldvoorstel kon niet worden gemaakt." }, { status: response.status || 502 });
    return Response.json({ image: `data:image/png;base64,${image}` });
  } catch {
    return Response.json({ error: "Het beeldvoorstel kon niet worden gemaakt. Probeer het later opnieuw." }, { status: 500 });
  }
}
