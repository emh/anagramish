CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`player` text NOT NULL,
	`created_at` integer NOT NULL,
	`environment` text NOT NULL,
	`entry` text NOT NULL,
	`screen` text NOT NULL,
	`rating` text,
	`comment` text NOT NULL,
	`app_version` text NOT NULL,
	`session_id` text,
	`mode` text,
	`puzzle_date` text,
	`hard` integer,
	`completed` integer,
	`player_type` text NOT NULL,
	`first_play_day` text,
	`tutorial_experiment` text,
	`tutorial_variant` text
);
--> statement-breakpoint
CREATE INDEX `idx_feedback_environment_created` ON `feedback` (`environment`,`created_at`,`id`);