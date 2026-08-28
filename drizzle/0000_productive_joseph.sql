CREATE TABLE `contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT 'een rouwdier' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'Tekst' NOT NULL,
	`text_value` text DEFAULT '' NOT NULL,
	`reference` text DEFAULT '' NOT NULL,
	`reference_link` text DEFAULT '' NOT NULL,
	`attachments_json` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'visible' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_contributions_status_created_at` ON `contributions` (`status`,`created_at`);