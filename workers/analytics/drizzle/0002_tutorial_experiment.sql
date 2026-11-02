-- Existing summaries have no experiment metadata and remain valid. Only newly
-- tagged tutorial starts enter the trial; no raw-history rebuild is necessary.
ALTER TABLE events ADD COLUMN experiment TEXT;
--> statement-breakpoint
ALTER TABLE events ADD COLUMN variant TEXT;
