import { env } from "cloudflare:workers";

type DatabaseEnv = { DB: D1Database };
let ready: Promise<void> | null = null;

export function ensureContributionStore() {
  if (!ready) {
    const db = (env as unknown as DatabaseEnv).DB;
    ready = db.batch([
      db.prepare("CREATE TABLE IF NOT EXISTS contributions (id text PRIMARY KEY NOT NULL, title text NOT NULL DEFAULT 'een rouwdier', description text NOT NULL DEFAULT '', kind text NOT NULL DEFAULT 'Tekst', text_value text NOT NULL DEFAULT '', reference text NOT NULL DEFAULT '', reference_link text NOT NULL DEFAULT '', attachments_json text NOT NULL DEFAULT '[]', landscape text NOT NULL DEFAULT 'test', status text NOT NULL DEFAULT 'visible', created_at integer NOT NULL)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_contributions_landscape_status_created_at ON contributions (landscape, status, created_at)"),
      db.prepare("CREATE TABLE IF NOT EXISTS ai_generations (id text PRIMARY KEY NOT NULL, created_at integer NOT NULL)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations (created_at)"),
      db.prepare("CREATE TABLE IF NOT EXISTS landscapes (id text PRIMARY KEY NOT NULL, name text NOT NULL, active integer NOT NULL DEFAULT 0, created_at integer NOT NULL)"),
      db.prepare("INSERT OR IGNORE INTO landscapes (id, name, active, created_at) VALUES ('test', 'Testlandschap', 1, 0)"),
    ]).then(() => undefined);
  }
  return ready;
}
