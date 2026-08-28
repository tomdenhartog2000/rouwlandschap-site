export type StoredAttachment = {
  name: string;
  type: string;
  role: "photo" | "drawing" | "audio";
};

export type LandscapeContribution = {
  id: string;
  title: string;
  description: string;
  kind: string;
  images: string[];
  drawing: string;
  audio: string;
  text: string;
  reference: string;
  referenceLink: string;
  createdAt: number;
};

export function readAttachments(value: string): StoredAttachment[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is StoredAttachment => Boolean(
      item && typeof item === "object" &&
      typeof (item as StoredAttachment).name === "string" &&
      typeof (item as StoredAttachment).type === "string" &&
      ["photo", "drawing", "audio"].includes((item as StoredAttachment).role),
    ));
  } catch {
    return [];
  }
}

export function mediaUrl(id: string, name: string) {
  return `/api/contributions/${encodeURIComponent(id)}/media/${encodeURIComponent(name)}`;
}
