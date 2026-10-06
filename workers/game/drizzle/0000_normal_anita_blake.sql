CREATE TABLE `outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`player` text NOT NULL,
	`mode` text NOT NULL,
	`date` text,
	`hard` integer NOT NULL,
	`pair` text NOT NULL,
	`puzzle_number` integer,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`seconds` integer,
	`mistakes` integer,
	`words` text,
	`resumed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_player` ON `sessions` (`player`);