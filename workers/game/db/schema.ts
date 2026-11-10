import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const sessions = sqliteTable('sessions', {
 id:text('id').primaryKey(), player:text('player').notNull(), mode:text('mode').notNull(), date:text('date'), hard:integer('hard').notNull(), pair:text('pair').notNull(), puzzleNumber:integer('puzzle_number'), startedAt:integer('started_at').notNull(), completedAt:integer('completed_at'), seconds:integer('seconds'), mistakes:integer('mistakes'), words:text('words'), resumed:integer('resumed').notNull().default(0)
}, t=>[index('idx_sessions_player').on(t.player),index('idx_sessions_player_started').on(t.player,t.startedAt)]);
export const outbox = sqliteTable('outbox', { id:text('id').primaryKey(), payload:text('payload').notNull(), createdAt:integer('created_at').notNull() });

export const feedbackReceipts = sqliteTable('feedback_receipts', {id:text('id').primaryKey(),player:text('player').notNull(),createdAt:integer('created_at').notNull()},t=>[index('idx_feedback_receipts_player_created').on(t.player,t.createdAt)]);
