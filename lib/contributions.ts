export type StoredAttachment = {
  name: string;
  type: string;
  role: "photo" | "drawing" | "audio" | "ai";
  exactDrawing?: boolean;
};

export type LandscapeContribution = {
  id: string;
  title: string;
  description: string;
  kind: string;
  aiImage: string;
  images: string[];
  drawing: string;
  audio: string;
  text: string;
  reference: string;
  referenceLink: string;
  motion: string;
  exactDrawing: boolean;
  landscape: string;
  sharing: "online" | "here" | "future";
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
      ["photo", "drawing", "audio", "ai"].includes((item as StoredAttachment).role),
    ));
  } catch {
    return [];
  }
}

export function mediaUrl(id: string, name: string) {
  if (name.startsWith("/")) return name;
  return `/api/contributions/${encodeURIComponent(id)}/media/${encodeURIComponent(name)}`;
}
