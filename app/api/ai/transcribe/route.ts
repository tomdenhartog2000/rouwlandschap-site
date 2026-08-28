import { env } from "cloudflare:workers";

type OpenAiEnv = { OPENAI_API_KEY?: string };

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const apiKey = (env as unknown as OpenAiEnv).OPENAI_API_KEY;
  if (!apiKey) return Response.json({ error: "De geluidsfunctie is nog niet ingesteld." }, { status: 503 });

  try {
    const incoming = await request.formData();
    const audio = incoming.get("audio");
    if (!(audio instanceof File) || !audio.size || !audio.type.startsWith("audio/") || audio.size > MAX_AUDIO_BYTES) {
      return Response.json({ error: "Deze geluidsopname kan niet worden gebruikt." }, { status: 400 });
    }

    const body = new FormData();
    body.set("model", "gpt-transcribe");
    body.set("file", audio);
    body.set("language", "nl");
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
    });
    const result = await response.json() as { text?: string; error?: { message?: string } };
    const transcript = result.text?.trim();
    if (!response.ok || !transcript) return Response.json({ error: result.error?.message || "De opname kon niet worden omgezet naar tekst." }, { status: response.status || 502 });
    return Response.json({ transcript: transcript.slice(0, 4_000) });
  } catch {
    return Response.json({ error: "De opname kon niet worden omgezet naar tekst. Probeer het later opnieuw." }, { status: 500 });
  }
}
