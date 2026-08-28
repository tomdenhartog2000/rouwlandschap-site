CREATE TABLE `ai_generations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ai_generations_created_at` ON `ai_generations` (`created_at`);