CREATE TABLE feedback_daily_counts (
 environment TEXT NOT NULL,
 day TEXT NOT NULL,
 submissions INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(environment,day)
);
--> statement-breakpoint
CREATE TRIGGER feedback_count_insert AFTER INSERT ON feedback BEGIN
 INSERT INTO feedback_daily_counts(environment,day,submissions)
 VALUES(NEW.environment,strftime('%Y-%m-%d',NEW.created_at/1000,'unixepoch'),1)
 ON CONFLICT(environment,day) DO UPDATE SET submissions=submissions+1;
END;
--> statement-breakpoint
-- Seed existing submissions once; replacing each total includes rows received
-- after the trigger was installed without counting them twice.
INSERT INTO feedback_daily_counts(environment,day,submissions)
 SELECT environment,strftime('%Y-%m-%d',created_at/1000,'unixepoch'),COUNT(*)
 FROM feedback GROUP BY environment,strftime('%Y-%m-%d',created_at/1000,'unixepoch')
 ON CONFLICT(environment,day) DO UPDATE SET submissions=excluded.submissions;
