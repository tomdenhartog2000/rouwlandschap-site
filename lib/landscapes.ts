export const DEFAULT_LANDSCAPE_ID = "test";

const landscapes = {
  test: { id: "test", name: "Testlandschap" },
} as const;

export function landscapeFor(id?: string | null) {
  return landscapes[id as keyof typeof landscapes] ?? landscapes.test;
}
