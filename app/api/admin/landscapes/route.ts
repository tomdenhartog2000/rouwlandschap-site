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

export async function POST(request: Request) {
  if (!await isAdmin(request)) return Response.json({ error: "Niet toegestaan." }, { status: 401 });
  await ensureContributionStore();
  const { name } = await request.json() as { name?: string };
  const cleanName = (name || "").trim().slice(0, 80);
  const id = cleanName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);
  if (!cleanName || !id) return Response.json({ error: "Geef het landschap een naam." }, { status: 400 });
  try { await getDb().insert(landscapes).values({ id, name: cleanName, active: 0, createdAt: Date.now() }); }
  catch { return Response.json({ error: "Deze naam bestaat al." }, { status: 409 }); }
  return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
  if (!await isAdmin(request)) return Response.json({ error: "Niet toegestaan." }, { status: 401 });
  await ensureContributionStore();
  const { id } = await request.json() as { id?: string };
  if (!id) return Response.json({ error: "Kies een landschap." }, { status: 400 });
  await getDb().batch([getDb().update(landscapes).set({ active: 0 }), getDb().update(landscapes).set({ active: 1 }).where(eq(landscapes.id, id))]);
  return Response.json({ ok: true });
}
