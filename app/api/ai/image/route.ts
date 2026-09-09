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
    const aiPath = incoming.get("aiPath") === "together" ? "together" : "translate";
    const sourceKind = incoming.get("sourceKind") === "drawing" ? "drawing" : incoming.get("sourceKind") === "photo" ? "photo" : "none";
    const context = typeof incoming.get("context") === "string" ? String(incoming.get("context")).trim().slice(0, 2_000) : "";
    const source = incoming.get("source");
    const sourceFile = source instanceof File && source.size ? source : null;
    if (sourceFile && (!sourceFile.type.startsWith("image/") || sourceFile.size > MAX_IMAGE_BYTES)) return Response.json({ error: "Deze afbeelding kan niet worden gebruikt." }, { status: 400 });
    const isConstrainedEdit = aiPath === "together" && Boolean(sourceFile);
    if (isConstrainedEdit && !direction && !baseDirection) return Response.json({ error: "Schrijf eerst wat AI precies aan je beeld mag aanpassen." }, { status: 400 });

    const prompt = [
      isConstrainedEdit ? "Perform one precise, constrained edit to the supplied image for a participatory art project about living with loss." : "Create one quiet visual addition for a participatory art project about living with loss.",
      isRevision ? "Treat the supplied image as the current AI result. Keep its recognisable subject, structure, lines, proportions, placement, composition, and every element the visitor did not ask to change. Apply exactly and only the requested adjustment and return one integrated image." : isConstrainedEdit && sourceKind === "drawing" ? "Edit the supplied drawing into one integrated co-created image. The visitor's drawn line is the essential structural source: follow the same path, turns, proportions, placement, and overall silhouette closely. Preserve the composition. You may minimally smooth uneven strokes without moving or replacing the line. Apply exactly and only the change the visitor explicitly requests." : isConstrainedEdit ? "Edit the supplied first photo into one integrated co-created image. Keep the original subject, proportions, placement, and composition clearly recognisable. Apply exactly and only the change the visitor explicitly requests." : sourceFile && sourceKind === "drawing" ? "Use the supplied drawing as the structural source for a new visual version. Follow the same path, turns, proportions, and overall silhouette closely. You may gently smooth uneven strokes and make the linework more fluent, but do not invent a different line, object, symbol, or composition." : sourceFile ? "Use the first supplied photo as source material. Create a fully developed new visual interpretation from it. It may be expanded, transformed, and re-composed while remaining clearly connected to that photo." : "Make a visual starting point from the visitor's words without illustrating them literally.",
      isConstrainedEdit ? "Do not add any new object, symbol, decoration, motif, plant, branch, leaf, heart, texture, pattern, or background detail unless the visitor explicitly asks for that exact addition. A colour or background change is not permission to add decorative content. The visitor's explicitly requested colours override general style preferences." : "",
      "Use restrained, natural colours and a simple composition. Do not add text, letters, names, faces, people, religious symbols, memorial symbols, flames, sparkles, dramatic light, logos, or watermarks.",
      isRevision && baseDirection ? `The visitor's original requested edit: ${baseDirection}` : "",
      isRevision && direction ? `The visitor now wants this additional change: ${direction}` : direction ? `The visitor's complete requested edit: ${direction}` : isConstrainedEdit ? "" : "Make a quiet visual interpretation.",
      context && !isConstrainedEdit ? `Visitor context: ${context}` : "",
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
