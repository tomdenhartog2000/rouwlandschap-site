import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { contributions } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { mediaUrl, readAttachments } from "@/lib/contributions";
import { ensureContributionStore } from "@/lib/contribution-store";

export async function GET(request: Request) {
  if (!await isAdmin(request)) return Response.json({ error: "Niet toegestaan." }, { status: 401 });
  await ensureContributionStore();
  const rows = await getDb().select().from(contributions).orderBy(desc(contributions.createdAt));
  return Response.json({ contributions: rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    kind: row.kind,
    text: row.textValue,
    reference: row.reference,
    referenceLink: row.referenceLink,
    landscape: row.landscape,
    sharing: row.sharing === "here" || row.sharing === "future" ? row.sharing : "online",
    exhibitionProcess: row.exhibitionProcess === "co-creation" || row.exhibitionProcess === "proposal" || row.exhibitionProcess === "designer" ? row.exhibitionProcess : "",
    contactEmail: row.contactEmail,
    contactConsentAt: row.contactConsentAt,
    status: row.status,
    createdAt: row.createdAt,
    attachments: readAttachments(row.attachmentsJson).map((item) => ({ ...item, url: mediaUrl(row.id, item.name) })),
  })) });
}
