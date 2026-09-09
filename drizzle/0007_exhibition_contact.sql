ALTER TABLE contributions ADD COLUMN exhibition_process text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE contributions ADD COLUMN contact_email text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE contributions ADD COLUMN contact_consent_at integer DEFAULT 0 NOT NULL;
