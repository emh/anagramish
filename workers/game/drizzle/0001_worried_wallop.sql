CREATE TABLE `feedback_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`player` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_feedback_receipts_player_created` ON `feedback_receipts` (`player`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sessions_player_started` ON `sessions` (`player`,`started_at`);