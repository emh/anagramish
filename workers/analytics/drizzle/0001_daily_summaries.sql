-- D1's rowid is the append cursor, not the event timestamp (late arrivals work).
CREATE INDEX idx_events_environment ON events(environment);
--> statement-breakpoint
CREATE TABLE analytics_summary_state (
 environment TEXT PRIMARY KEY NOT NULL,
 latest_rowid INTEGER NOT NULL DEFAULT 0,
 cursor INTEGER NOT NULL DEFAULT 0,
 refreshed_at INTEGER NOT NULL DEFAULT 0,
 next_refresh INTEGER NOT NULL DEFAULT 0,
 lease_token TEXT,
 lease_until INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE analytics_daily_summaries (
 environment TEXT NOT NULL,
 part INTEGER NOT NULL,
 payload TEXT NOT NULL,
 PRIMARY KEY(environment,part)
);
--> statement-breakpoint
INSERT INTO analytics_summary_state(environment,latest_rowid)
 SELECT 'production',COALESCE(MAX(rowid),0) FROM events WHERE environment='production';
--> statement-breakpoint
INSERT INTO analytics_summary_state(environment,latest_rowid)
 SELECT 'preview',COALESCE(MAX(rowid),0) FROM events WHERE environment='preview';
--> statement-breakpoint
CREATE TRIGGER analytics_summary_new_event AFTER INSERT ON events BEGIN
 UPDATE analytics_summary_state SET latest_rowid=NEW.rowid WHERE environment=NEW.environment;
END;

--> statement-breakpoint
CREATE TABLE analytics_report_cache (
 environment TEXT NOT NULL,
 days INTEGER NOT NULL,
 cursor INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 payload TEXT NOT NULL,
 PRIMARY KEY(environment,days)
);
