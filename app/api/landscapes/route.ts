import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { landscapes } from "@/db/schema";
import { ensureContributionStore } from "@/lib/contribution-store";
import { activeLandscape } from "@/lib/landscape-store";

export async function GET() {
  await ensureContributionStore();
  const active = await activeLandscape();
  const visible = await getDb().select().from(landscapes).where(eq(landscapes.visible, 1)).orderBy(asc(landscapes.createdAt));
  const list = visible.some((item) => item.id === active.id) ? visible : [active, ...visible];
  return Response.json({ landscapes: list, active });
}
