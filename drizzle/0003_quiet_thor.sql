CREATE TABLE `landscapes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
