export function openAiHeaders(request: Request, apiKey: string, json = false) {
  const suppliedKey = request.headers.get("Idempotency-Key")?.trim() || "";
  const idempotencyKey = /^[a-zA-Z0-9._:-]{8,128}$/.test(suppliedKey) ? suppliedKey : crypto.randomUUID();
  return {
    Authorization: `Bearer ${apiKey}`,
    "Idempotency-Key": idempotencyKey,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}
