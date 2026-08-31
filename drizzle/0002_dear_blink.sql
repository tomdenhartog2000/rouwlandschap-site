DROP INDEX `idx_contributions_status_created_at`;--> statement-breakpoint
ALTER TABLE `contributions` ADD `landscape` text DEFAULT 'test' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_contributions_landscape_status_created_at` ON `contributions` (`landscape`,`status`,`created_at`);