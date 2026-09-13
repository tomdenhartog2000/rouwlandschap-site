INSERT OR IGNORE INTO landscapes (id, name, active, visible, created_at)
VALUES ('afstudeerexpositie', 'Landschap van de afstudeerexpositie', 0, 1, 4);
--> statement-breakpoint
UPDATE landscapes
SET active = CASE WHEN id = 'expositie' THEN 1 ELSE 0 END;
