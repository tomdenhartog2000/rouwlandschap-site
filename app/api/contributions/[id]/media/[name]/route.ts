import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { contributions, landscapes } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { readAttachments } from "@/lib/contributions";
import { ensureContributionStore } from "@/lib/contribution-store";
import { activeLandscape } from "@/lib/landscape-store";

type StorageEnv = { UPLOADS: R2Bucket };

export async function GET(request: Request, context: { params: Promise<{ id: string; name: string }> }) {
  await ensureContributionStore();
  const { id, name } = await context.params;
  const [row] = await getDb().select().from(contributions).where(eq(contributions.id, id)).limit(1);
  if (!row || !readAttachments(row.attachmentsJson).some((item) => item.name === name)) return new Response("Niet gevonden", { status: 404 });
  if (!await isAdmin(request)) {
    if (row.status !== "visible") return new Response("Niet gevonden", { status: 404 });
    const [[rowLandscape], active] = await Promise.all([
      getDb().select().from(landscapes).where(eq(landscapes.id, row.landscape)).limit(1),
      activeLandscape(),
    ]);
    if (!rowLandscape || (!rowLandscape.visible && rowLandscape.id !== active.id)) return new Response("Niet gevonden", { status: 404 });
  }
  const object = await (env as unknown as StorageEnv).UPLOADS.get(`${id}/${name}`);
  if (!object) return new Response("Niet gevonden", { status: 404 });
  return new Response(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType || "application/octet-stream", "Cache-Control": "public, max-age=3600" } });
}
