ALTER TABLE `landscapes` ADD `visible` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `landscapes` SET `visible` = 1 WHERE `id` = 'test';--> statement-breakpoint
INSERT OR IGNORE INTO `landscapes` (`id`, `name`, `active`, `visible`, `created_at`) VALUES ('museum', 'Museumlandschap', 0, 0, 1);--> statement-breakpoint
INSERT OR IGNORE INTO `landscapes` (`id`, `name`, `active`, `visible`, `created_at`) VALUES ('stilte', 'Landschap van stilte', 0, 0, 2);
