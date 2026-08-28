import { env } from "cloudflare:workers";

type DatabaseEnv = { DB: D1Database };
let ready: Promise<void> | null = null;

export function ensureContributionStore() {
  if (!ready) {
    const db = (env as unknown as DatabaseEnv).DB;
    ready = db.batch([
      db.prepare("CREATE TABLE IF NOT EXISTS contributions (id text PRIMARY KEY NOT NULL, title text NOT NULL DEFAULT 'een rouwdier', description text NOT NULL DEFAULT '', kind text NOT NULL DEFAULT 'Tekst', text_value text NOT NULL DEFAULT '', reference text NOT NULL DEFAULT '', reference_link text NOT NULL DEFAULT '', attachments_json text NOT NULL DEFAULT '[]', status text NOT NULL DEFAULT 'visible', created_at integer NOT NULL)"),
      db.prepare("CREATE INDEX IF NOT EXISTS idx_contributions_status_created_at ON contributions (status, created_at)"),
    ]).then(() => undefined);
  }
  return ready;
}
