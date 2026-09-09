import { env } from "cloudflare:workers";

type DatabaseEnv = { DB: D1Database };
let ready: Promise<void> | null = null;

export function ensureContributionStore() {
  if (!ready) {
    const db = (env as unknown as DatabaseEnv).DB;
    ready = db.batch([
      db.prepare("INSERT OR IGNORE INTO landscapes (id, name, active, visible, created_at) VALUES ('test', 'Testlandschap', 1, 1, 0)"),
      db.prepare("INSERT OR IGNORE INTO landscapes (id, name, active, visible, created_at) VALUES ('museum', 'Museumlandschap', 0, 0, 1)"),
      db.prepare("INSERT OR IGNORE INTO landscapes (id, name, active, visible, created_at) VALUES ('stilte', 'Landschap van stilte', 0, 0, 2)"),
    ]).then(() => undefined);
  }
  return ready;
}
