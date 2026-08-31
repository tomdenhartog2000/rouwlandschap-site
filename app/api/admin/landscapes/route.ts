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
  const { id, visible } = await request.json() as { id?: string; visible?: boolean };
  if (!id) return Response.json({ error: "Kies een landschap." }, { status: 400 });
  if (typeof visible === "boolean") {
    await getDb().update(landscapes).set({ visible: visible ? 1 : 0 }).where(eq(landscapes.id, id));
    return Response.json({ ok: true });
  }
  await getDb().batch([getDb().update(landscapes).set({ active: 0 }), getDb().update(landscapes).set({ active: 1, visible: 1 }).where(eq(landscapes.id, id))]);
  return Response.json({ ok: true });
}
