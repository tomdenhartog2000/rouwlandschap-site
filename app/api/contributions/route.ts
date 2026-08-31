import { and, desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { contributions, landscapes } from "@/db/schema";
import { getDb } from "@/db";
import { mediaUrl, readAttachments, type LandscapeContribution, type StoredAttachment } from "@/lib/contributions";
import { ensureContributionStore } from "@/lib/contribution-store";
import { activeLandscape } from "@/lib/landscape-store";

type StorageEnv = { UPLOADS: R2Bucket };
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_AUDIO_BYTES = 18 * 1024 * 1024;

function storage() {
  return env as unknown as StorageEnv;
}

function stringField(data: FormData, name: string, limit = 4_000) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function fileExtension(file: File, fallback: string) {
  const fromName = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (fromName && fromName.length <= 8) return fromName;
  const fromType = file.type.split("/").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return fromType || fallback;
}

function toLandscapeContribution(row: typeof contributions.$inferSelect): LandscapeContribution {
  const attachments = readAttachments(row.attachmentsJson);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    kind: row.kind,
    images: attachments.filter((item) => item.role === "photo" || item.role === "ai").map((item) => mediaUrl(row.id, item.name)),
    drawing: attachments.find((item) => item.role === "drawing") ? mediaUrl(row.id, attachments.find((item) => item.role === "drawing")!.name) : "",
    audio: attachments.find((item) => item.role === "audio") ? mediaUrl(row.id, attachments.find((item) => item.role === "audio")!.name) : "",
    text: row.textValue,
    reference: row.reference,
    referenceLink: row.referenceLink,
    motion: row.motion,
    landscape: row.landscape,
    createdAt: row.createdAt,
  };
}

export async function GET(request: Request) {
  try {
    await ensureContributionStore();
    const active = await activeLandscape();
    const requested = new URL(request.url).searchParams.get("landschap");
    const target = requested ? await getDb().select().from(landscapes).where(eq(landscapes.id, requested)).limit(1) : [active];
    const landscape = target[0];
    if (!landscape || (!landscape.visible && landscape.id !== active.id)) return Response.json({ contributions: [] });
    const rows = await getDb().select().from(contributions).where(and(eq(contributions.status, "visible"), eq(contributions.landscape, landscape.id))).orderBy(desc(contributions.createdAt));
    return Response.json({ contributions: rows.map(toLandscapeContribution) });
  } catch (error) {
    return Response.json({ error: "Het gedeelde landschap is nog niet beschikbaar." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureContributionStore();
    const data = await request.formData();
    const photoFiles = data.getAll("photos").filter((item): item is File => item instanceof File).slice(0, MAX_IMAGES);
    const drawing = data.get("drawing");
    const audio = data.get("audio");
    const aiImage = data.get("aiImage");
    const drawingFile = drawing instanceof File && drawing.size ? drawing : null;
    const audioFile = audio instanceof File && audio.size ? audio : null;
    const aiImageFile = aiImage instanceof File && aiImage.size ? aiImage : null;

    if (photoFiles.some((file) => !file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES) || (drawingFile && (!drawingFile.type.startsWith("image/") || drawingFile.size > MAX_IMAGE_BYTES)) || (aiImageFile && (!aiImageFile.type.startsWith("image/") || aiImageFile.size > MAX_IMAGE_BYTES))) {
      return Response.json({ error: "Een afbeelding is te groot of heeft geen geldig afbeeldingsformaat." }, { status: 400 });
    }
    if (audioFile && (!audioFile.type.startsWith("audio/") || audioFile.size > MAX_AUDIO_BYTES)) {
      return Response.json({ error: "De geluidsopname is te groot of heeft geen geldig audioformaat." }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const attachments: StoredAttachment[] = [];
    const files: Array<{ file: File; role: StoredAttachment["role"]; name: string }> = [];
    photoFiles.forEach((file, index) => files.push({ file, role: "photo", name: `foto-${index + 1}.${fileExtension(file, "jpg")}` }));
    if (drawingFile) files.push({ file: drawingFile, role: "drawing", name: `tekening.${fileExtension(drawingFile, "png")}` });
    if (aiImageFile) files.push({ file: aiImageFile, role: "ai", name: `ai-toevoeging.${fileExtension(aiImageFile, "png")}` });
    if (audioFile) files.push({ file: audioFile, role: "audio", name: `geluid.${fileExtension(audioFile, "webm")}` });

    for (const item of files) {
      await storage().UPLOADS.put(`${id}/${item.name}`, await item.file.arrayBuffer(), { httpMetadata: { contentType: item.file.type || "application/octet-stream" } });
      attachments.push({ name: item.name, type: item.file.type || "application/octet-stream", role: item.role });
    }

    const now = Date.now();
    const kind = stringField(data, "kind", 80) || "Tekst";
    const title = stringField(data, "title", 140) || "een rouwdier";
    const landscape = (await activeLandscape()).id;
    const [row] = await getDb().insert(contributions).values({
      id,
      title,
      description: stringField(data, "description"),
      kind,
      textValue: stringField(data, "text"),
      reference: stringField(data, "reference"),
      referenceLink: stringField(data, "referenceLink", 1_000),
      motion: stringField(data, "motion", 24),
      attachmentsJson: JSON.stringify(attachments),
      landscape,
      status: "visible",
      createdAt: now,
    }).returning();
    return Response.json({ contribution: toLandscapeContribution(row) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: "Je rouwdier kon niet worden toegevoegd. Probeer het opnieuw." }, { status: 500 });
  }
}
