import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { landscapes } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { ensureContributionStore } from "@/lib/contribution-store";

export async function GET(request: Request) {
  if (!await isAdmin(request)) return Response.json({ error: "Niet toegestaan." }, { status: 401 });
  await ensureContributionStore();
  return Response.json({ landscapes: await getDb().select().from(landscapes).orderBy(desc(landscapes.active), desc(landscapes.createdAt)) });
}

export async function PATCH(request: Request) {
  if (!await isAdmin(request)) return Response.json({ error: "Niet toegestaan." }, { status: 401 });
  await ensureContributionStore();
  const { id, visible, name } = await request.json() as { id?: string; visible?: boolean; name?: unknown };
  if (!id) return Response.json({ error: "Kies een landschap." }, { status: 400 });
  if (name !== undefined) {
    const nextName = typeof name === "string" ? name.trim() : "";
    if (!nextName) return Response.json({ error: "Een landschap heeft een naam nodig." }, { status: 400 });
    if (nextName.length > 80) return Response.json({ error: "De naam mag maximaal 80 tekens bevatten." }, { status: 400 });
    await getDb().update(landscapes).set({ name: nextName }).where(eq(landscapes.id, id));
    return Response.json({ ok: true, name: nextName });
  }
  if (typeof visible === "boolean") {
    await getDb().update(landscapes).set({ visible: visible ? 1 : 0 }).where(eq(landscapes.id, id));
    return Response.json({ ok: true });
  }
  await getDb().batch([getDb().update(landscapes).set({ active: 0 }), getDb().update(landscapes).set({ active: 1, visible: 1 }).where(eq(landscapes.id, id))]);
  return Response.json({ ok: true });
}
