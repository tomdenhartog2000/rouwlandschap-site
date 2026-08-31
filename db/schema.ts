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
    landscape: text("landscape").notNull().default("test"),
    status: text("status").notNull().default("visible"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_contributions_landscape_status_created_at").on(table.landscape, table.status, table.createdAt)],
);

export const aiGenerations = sqliteTable(
  "ai_generations",
  {
    id: text("id").primaryKey(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_ai_generations_created_at").on(table.createdAt)],
);

export const landscapes = sqliteTable("landscapes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  active: integer("active").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});
