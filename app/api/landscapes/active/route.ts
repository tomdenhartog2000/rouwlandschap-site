import { ensureContributionStore } from "@/lib/contribution-store";
import { activeLandscape } from "@/lib/landscape-store";

export async function GET() {
  await ensureContributionStore();
  return Response.json({ landscape: await activeLandscape() });
}
