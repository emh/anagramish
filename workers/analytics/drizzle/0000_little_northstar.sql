CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`player` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`day` text NOT NULL,
	`environment` text NOT NULL,
	`mode` text,
	`puzzle_date` text,
	`hard` integer,
	`seconds` integer,
	`mistakes` integer,
	`word_count` integer,
	`resumed` integer DEFAULT 0 NOT NULL,
	`source` text,
	`medium` text,
	`campaign` text,
	`referrer` text,
	`landing` text,
	`country` text,
	`region` text,
	`device` text
);
--> statement-breakpoint
CREATE INDEX `idx_events_environment_day` ON `events` (`environment`,`day`);--> statement-breakpoint
CREATE INDEX `idx_events_player_day` ON `events` (`player`,`day`);