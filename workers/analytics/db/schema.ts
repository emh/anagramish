import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';
export const events = sqliteTable('events', {
 id:text('id').primaryKey(), kind:text('kind').notNull(), player:text('player').notNull(), occurredAt:integer('occurred_at').notNull(), day:text('day').notNull(), environment:text('environment').notNull(), mode:text('mode'), puzzleDate:text('puzzle_date'), hard:integer('hard'), seconds:integer('seconds'), mistakes:integer('mistakes'), wordCount:integer('word_count'), resumed:integer('resumed').notNull().default(0), source:text('source'), medium:text('medium'), campaign:text('campaign'), referrer:text('referrer'), landing:text('landing'), country:text('country'), region:text('region'), device:text('device'), experiment:text('experiment'), variant:text('variant')
}, t=>[index('idx_events_environment').on(t.environment), index('idx_events_environment_day').on(t.environment,t.day), index('idx_events_player_day').on(t.player,t.day)]);

export const summaryState = sqliteTable('analytics_summary_state', {
 environment:text('environment').primaryKey(), latestRowid:integer('latest_rowid').notNull().default(0),
 cursor:integer('cursor').notNull().default(0), refreshedAt:integer('refreshed_at').notNull().default(0),
 nextRefresh:integer('next_refresh').notNull().default(0), leaseToken:text('lease_token'), leaseUntil:integer('lease_until').notNull().default(0)
});
// Each bounded part contains daily aggregates; temporal/session facts allow exact
// distinct totals and cohorts without rereading the underlying event history.
export const dailySummaries = sqliteTable('analytics_daily_summaries', {
 environment:text('environment').notNull(), part:integer('part').notNull(), payload:text('payload').notNull()
},t=>[primaryKey({columns:[t.environment,t.part]})]);
export const reportCache = sqliteTable('analytics_report_cache', {
 environment:text('environment').notNull(), days:integer('days').notNull(), cursor:integer('cursor').notNull(),
 expiresAt:integer('expires_at').notNull(), payload:text('payload').notNull()
},t=>[primaryKey({columns:[t.environment,t.days]})]);

export const feedback = sqliteTable('feedback', {
 id:text('id').primaryKey(),player:text('player').notNull(),createdAt:integer('created_at').notNull(),environment:text('environment').notNull(),
 entry:text('entry').notNull(),screen:text('screen').notNull(),rating:text('rating'),comment:text('comment').notNull(),appVersion:text('app_version').notNull(),
 sessionId:text('session_id'),mode:text('mode'),puzzleDate:text('puzzle_date'),hard:integer('hard'),completed:integer('completed'),
 playerType:text('player_type').notNull(),firstPlayDay:text('first_play_day'),tutorialExperiment:text('tutorial_experiment'),tutorialVariant:text('tutorial_variant')
},t=>[index('idx_feedback_environment_created').on(t.environment,t.createdAt,t.id)]);

 // Insert-time counters keep dashboard refreshes independent of comment volume.
export const feedbackDailyCounts = sqliteTable('feedback_daily_counts', {
 environment:text('environment').notNull(),day:text('day').notNull(),submissions:integer('submissions').notNull().default(0)
},t=>[primaryKey({columns:[t.environment,t.day]})]);
