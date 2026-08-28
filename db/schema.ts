import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const contributions = sqliteTable(
  "contributions",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull().default("een rouwdier"),
    description: text("description").notNull().default(""),
    kind: text("kind").notNull().default("Tekst"),
    textValue: text("text_value").notNull().default(""),
    reference: text("reference").notNull().default(""),
    referenceLink: text("reference_link").notNull().default(""),
    attachmentsJson: text("attachments_json").notNull().default("[]"),
    status: text("status").notNull().default("visible"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_contributions_status_created_at").on(table.status, table.createdAt)],
);
