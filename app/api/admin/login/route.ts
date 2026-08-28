import { adminCookie, clearedAdminCookie, createAdminCookie, hasAdminConfiguration, passwordMatches } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!hasAdminConfiguration()) return Response.json({ error: "Beheer is nog niet ingesteld." }, { status: 503 });
  const { password } = await request.json() as { password?: string };
  if (!passwordMatches(password ?? "")) return Response.json({ error: "Deze toegangscode klopt niet." }, { status: 401 });
  const cookie = await createAdminCookie();
  if (!cookie) return Response.json({ error: "Beheer is nog niet ingesteld." }, { status: 503 });
  return Response.json({ ok: true }, { headers: { "Set-Cookie": adminCookie(cookie) } });
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearedAdminCookie } });
}
