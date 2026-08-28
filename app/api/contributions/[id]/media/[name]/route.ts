import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { contributions } from "@/db/schema";
import { readAttachments } from "@/lib/contributions";
import { ensureContributionStore } from "@/lib/contribution-store";

type StorageEnv = { UPLOADS: R2Bucket };

export async function GET(_request: Request, context: { params: Promise<{ id: string; name: string }> }) {
  await ensureContributionStore();
  const { id, name } = await context.params;
  const [row] = await getDb().select().from(contributions).where(eq(contributions.id, id)).limit(1);
  if (!row || row.status !== "visible" || !readAttachments(row.attachmentsJson).some((item) => item.name === name)) return new Response("Niet gevonden", { status: 404 });
  const object = await (env as unknown as StorageEnv).UPLOADS.get(`${id}/${name}`);
  if (!object) return new Response("Niet gevonden", { status: 404 });
  return new Response(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType || "application/octet-stream", "Cache-Control": "public, max-age=3600" } });
}
