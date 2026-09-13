import { env } from "cloudflare:workers";
import { EXPOSITIE_LANDSCHAP_ID, expositieRouwdieren } from "@/lib/rouwdieren-expositie";

type DatabaseEnv = { DB: D1Database };
let ready: Promise<void> | null = null;

export function ensureContributionStore() {
  if (!ready) {
    const db = (env as unknown as DatabaseEnv).DB;
    const contributionStatements = expositieRouwdieren.map((item, index) => db.prepare(
      `INSERT INTO contributions
        (id, title, description, kind, text_value, reference, reference_link, motion, attachments_json, landscape, sharing, exhibition_process, contact_email, contact_consent_at, status, created_at)
       VALUES (?, ?, ?, 'Expositie', ?, '', '', '', ?, ?, 'online', '', '', 0, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         description = excluded.description,
         text_value = excluded.text_value,
         status = CASE WHEN excluded.status = 'hidden' THEN 'hidden' ELSE contributions.status END`,
    ).bind(
      item.id,
      item.title,
      "",
      item.text,
      JSON.stringify([{ name: `/rouwdieren-expositie/${item.id}.jpg`, type: "image/jpeg", role: "photo" }]),
      EXPOSITIE_LANDSCHAP_ID,
      item.status ?? "visible",
      index + 1,
    ));
    ready = db.batch([
      db.prepare("INSERT OR IGNORE INTO landscapes (id, name, active, visible, created_at) VALUES ('test', 'Testlandschap', 1, 1, 0)"),
      db.prepare("INSERT OR IGNORE INTO landscapes (id, name, active, visible, created_at) VALUES ('museum', 'Museumlandschap', 0, 0, 1)"),
      db.prepare("INSERT OR IGNORE INTO landscapes (id, name, active, visible, created_at) VALUES ('stilte', 'Landschap van stilte', 0, 0, 2)"),
      db.prepare(`INSERT OR IGNORE INTO landscapes (id, name, active, visible, created_at) VALUES ('${EXPOSITIE_LANDSCHAP_ID}', 'Landschap van de expositie', 0, 1, 3)`),
      db.prepare("INSERT OR IGNORE INTO landscapes (id, name, active, visible, created_at) VALUES ('afstudeerexpositie', 'Landschap van de afstudeerexpositie', 0, 1, 4)"),
      ...contributionStatements,
    ]).then(() => undefined);
  }
  return ready;
}
