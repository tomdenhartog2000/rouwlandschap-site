import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { landscapes } from "@/db/schema";

export async function activeLandscape() {
  const [active, first] = await Promise.all([
    getDb().select().from(landscapes).where(eq(landscapes.active, 1)).limit(1),
    getDb().select().from(landscapes).orderBy(asc(landscapes.createdAt)).limit(1),
  ]);
  return active[0] || first[0] || { id: "test", name: "Testlandschap", active: 1, createdAt: 0 };
}
