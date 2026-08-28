import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { contributions } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { readAttachments } from "@/lib/contributions";
import { ensureContributionStore } from "@/lib/contribution-store";

type StorageEnv = { UPLOADS: R2Bucket };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(request)) return Response.json({ error: "Niet toegestaan." }, { status: 401 });
  await ensureContributionStore();
  const { id } = await context.params;
  const { status } = await request.json() as { status?: string };
  if (status !== "visible" && status !== "hidden") return Response.json({ error: "Onbekende status." }, { status: 400 });
  await getDb().update(contributions).set({ status }).where(eq(contributions.id, id));
  return Response.json({ ok: true, status });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await isAdmin(request)) return Response.json({ error: "Niet toegestaan." }, { status: 401 });
  await ensureContributionStore();
  const { id } = await context.params;
  const [row] = await getDb().select().from(contributions).where(eq(contributions.id, id)).limit(1);
  if (!row) return Response.json({ error: "Niet gevonden." }, { status: 404 });
  const attachmentKeys = readAttachments(row.attachmentsJson).map((item) => `${id}/${item.name}`);
  if (attachmentKeys.length) await (env as unknown as StorageEnv).UPLOADS.delete(attachmentKeys);
  await getDb().delete(contributions).where(eq(contributions.id, id));
  return Response.json({ ok: true });
}
