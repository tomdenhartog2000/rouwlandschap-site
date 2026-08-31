import { env } from "cloudflare:workers";

type OpenAiEnv = { OPENAI_API_KEY?: string };
type TextMode = "text" | "motion";

function outputText(result: { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }) {
  if (result.output_text) return result.output_text;
  return result.output?.flatMap((item) => item.content || []).filter((item) => item.type === "output_text").map((item) => item.text || "").join("\n") || "";
}

export async function POST(request: Request) {
  const apiKey = (env as unknown as OpenAiEnv).OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "De AI-tekstfunctie is nog niet ingesteld." }, { status: 503 });
  try {
    const data = await request.json() as { mode?: TextMode; text?: string; direction?: string };
    const mode = data.mode === "motion" ? "motion" : "text";
    const text = String(data.text || "").trim().slice(0, 4_000);
    const direction = String(data.direction || "").trim().slice(0, 800);
    if (!text) return Response.json({ error: "Er zijn nog geen woorden om mee te werken." }, { status: 400 });
    const instructions = mode === "text"
      ? "Je helpt iemand alleen hun eigen Nederlandse woorden te ordenen. Geef uitsluitend een herziene versie van de tekst terug. Bewaar feiten, toon, twijfel en eigen formuleringen. Voeg geen herinneringen, troost, uitleg, metaforen of nieuwe betekenis toe. Corrigeer alleen helderheid, volgorde, spelling en interpunctie. Als de tekst al helder is, geef hem vrijwel ongewijzigd terug."
      : "Kies één subtiele bewegingswijze voor een digitaal rouwdier op basis van de Nederlandse tekst. Antwoord uitsluitend met één van deze woorden: adem, drijf, wieg. Kies niets dramatisch of opvallends.";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4.1-mini", store: false, instructions, input: `${direction ? `Wens van de bezoeker: ${direction}\n\n` : ""}Eigen woorden van de bezoeker:\n${text}` }),
    });
    const result = await response.json() as { error?: { message?: string }; output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const value = outputText(result).trim();
    if (!response.ok || !value) return Response.json({ error: result.error?.message || "De AI-versie kon niet worden gemaakt." }, { status: response.status || 502 });
    if (mode === "motion") {
      const motion = value.toLowerCase().includes("drijf") ? "drift" : value.toLowerCase().includes("wieg") ? "sway" : "breathe";
      return Response.json({ motion });
    }
    return Response.json({ text: value.slice(0, 4_000) });
  } catch {
    return Response.json({ error: "De AI-versie kon niet worden gemaakt. Probeer het later opnieuw." }, { status: 500 });
  }
}
