-- Older local previews created parts of the schema at runtime without recording
-- migrations. Record only structures that demonstrably already exist so the
-- normal migration runner can add everything that is still missing.
CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT OR IGNORE INTO d1_migrations (name)
SELECT '0000_productive_joseph.sql'
WHERE (SELECT COUNT(*) FROM pragma_table_info('contributions') WHERE name IN ('id', 'title', 'description', 'kind', 'text_value', 'reference', 'reference_link', 'attachments_json', 'status', 'created_at')) = 10;

INSERT OR IGNORE INTO d1_migrations (name)
SELECT '0001_redundant_albert_cleary.sql'
WHERE (SELECT COUNT(*) FROM pragma_table_info('ai_generations') WHERE name IN ('id', 'created_at')) = 2;

INSERT OR IGNORE INTO d1_migrations (name)
SELECT '0002_dear_blink.sql'
WHERE EXISTS (SELECT 1 FROM pragma_table_info('contributions') WHERE name = 'landscape');

INSERT OR IGNORE INTO d1_migrations (name)
SELECT '0003_quiet_thor.sql'
WHERE (SELECT COUNT(*) FROM pragma_table_info('landscapes') WHERE name IN ('id', 'name', 'active', 'created_at')) = 4;

INSERT OR IGNORE INTO d1_migrations (name)
SELECT '0004_visible_landscapes.sql'
WHERE EXISTS (SELECT 1 FROM pragma_table_info('landscapes') WHERE name = 'visible');

INSERT OR IGNORE INTO d1_migrations (name)
SELECT '0005_contribution_motion.sql'
WHERE EXISTS (SELECT 1 FROM pragma_table_info('contributions') WHERE name = 'motion');

INSERT OR IGNORE INTO d1_migrations (name)
SELECT '0006_contribution_sharing.sql'
WHERE EXISTS (SELECT 1 FROM pragma_table_info('contributions') WHERE name = 'sharing');

INSERT OR IGNORE INTO d1_migrations (name)
SELECT '0007_exhibition_contact.sql'
WHERE (SELECT COUNT(*) FROM pragma_table_info('contributions') WHERE name IN ('exhibition_process', 'contact_email', 'contact_consent_at')) = 3;
