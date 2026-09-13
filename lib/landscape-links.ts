export type LandscapeQueryValue = string | string[] | undefined;

export function normaliseLandscapeId(value: LandscapeQueryValue) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string") return "";
  const trimmed = candidate.trim();
  return /^[a-z0-9_-]{1,64}$/i.test(trimmed) ? trimmed : "";
}

export function projectExplanationUrl(origin: string, landscapeId: LandscapeQueryValue) {
  const url = new URL("/over-rouwdieren", origin);
  const validLandscapeId = normaliseLandscapeId(landscapeId);
  if (validLandscapeId) url.searchParams.set("landschap", validLandscapeId);
  return url.toString();
}

export function landscapeViewerPath(landscapeId: LandscapeQueryValue) {
  const query = new URLSearchParams({ kijk: "1" });
  const validLandscapeId = normaliseLandscapeId(landscapeId);
  if (validLandscapeId) query.set("landschap", validLandscapeId);
  return `/verken?${query.toString()}`;
}
