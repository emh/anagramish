import {startActivitySQL,tutorialFunnelSQL,tutorialLessonsSQL} from '../../../analytics/server/engagement.mjs';
// Frozen pre-cache queries for differential regression tests only.
export async function rawReport(env,environment,days,now) {
 const today=new Date(now).toISOString().slice(0,10);
 const from=new Date(now-(days-1)*86400000).toISOString().slice(0,10);
 const firsts=`SELECT player,MIN(day) first_day FROM events WHERE environment=? AND kind='game_play' GROUP BY player`;
 // First observed play determines acquisition, even when later visits use another source.
 const acquisition=`WITH ranked AS (
  SELECT player,day first_day,COALESCE(NULLIF(source,''),NULLIF(referrer,''),'Direct / unknown') source,
   COALESCE(NULLIF(medium,''),'—') medium,COALESCE(NULLIF(campaign,''),'—') campaign,
   ROW_NUMBER() OVER (PARTITION BY player ORDER BY occurred_at,id) rank
  FROM events WHERE environment=? AND kind='game_play'
 ), cohorts AS (
  SELECT * FROM ranked WHERE rank=1 AND first_day BETWEEN ? AND ?
 ), active AS (
  SELECT DISTINCT player,day FROM events WHERE environment=? AND kind='game_play'
 ), finished AS (
  SELECT DISTINCT player,day FROM events WHERE environment=? AND kind='game_complete'
 )
 SELECT source,medium,campaign,COUNT(*) new_players,
  SUM(first_day<?) eligible_first_day,
  SUM(first_day<? AND EXISTS(SELECT 1 FROM finished f WHERE f.player=c.player AND f.day=c.first_day)) first_day_finishers,
  SUM(first_day<date(?,'-1 day')) eligible_d1,
  SUM(first_day<date(?,'-1 day') AND EXISTS(SELECT 1 FROM active a WHERE a.player=c.player AND a.day=date(c.first_day,'+1 day'))) returned_d1
 FROM cohorts c GROUP BY source,medium,campaign ORDER BY new_players DESC,source,medium,campaign`;
 const results=await env.DB.batch([
  env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN kind='visit' THEN player END) visitors, COUNT(DISTINCT CASE WHEN kind='game_play' THEN player END) players, SUM(kind='game_start') starts,SUM(kind='game_complete') completions,SUM(kind='tutorial_start') tutorial_starts,SUM(kind='tutorial_complete') tutorial_completions,AVG(CASE WHEN kind='game_complete' THEN seconds END) avg_seconds,MAX(occurred_at) last_event FROM events WHERE environment=? AND day BETWEEN ? AND ?`).bind(environment,from,today),
  env.DB.prepare(`WITH firsts AS (${firsts}) SELECT e.day,COUNT(DISTINCT CASE WHEN kind='visit' THEN e.player END) visitors,COUNT(DISTINCT CASE WHEN kind='game_play' THEN e.player END) players,COUNT(DISTINCT CASE WHEN kind='game_play' AND f.first_day=e.day THEN e.player END) new_players,SUM(kind='game_start') starts,SUM(kind='game_complete') completions FROM events e LEFT JOIN firsts f ON f.player=e.player WHERE e.environment=? AND e.day BETWEEN ? AND ? GROUP BY e.day ORDER BY e.day DESC`).bind(environment,environment,from,today),
  env.DB.prepare(`SELECT COALESCE(source,referrer,'Direct / unknown') source,COALESCE(medium,'—') medium,COALESCE(campaign,'—') campaign,COUNT(DISTINCT player) players,COUNT(*) active_game_days FROM events WHERE environment=? AND kind='game_play' AND day BETWEEN ? AND ? GROUP BY source,medium,campaign ORDER BY players DESC LIMIT 30`).bind(environment,from,today),
  env.DB.prepare(`SELECT COALESCE(country,'Unknown') country,COALESCE(region,'Unknown') region,COUNT(DISTINCT player) players FROM events WHERE environment=? AND kind='game_play' AND day BETWEEN ? AND ? GROUP BY country,region ORDER BY players DESC LIMIT 20`).bind(environment,from,today),
  // Select sessions with activity in the period, then join their completion.
  // Reopening on another day must not count the same session twice.
  env.DB.prepare(`WITH active_games AS (
   SELECT DISTINCT environment,player,puzzle_date,hard,
    CASE kind WHEN 'game_start' THEN substr(id,7) WHEN 'game_play' THEN substr(id,6,36) ELSE substr(id,10) END session_id
   FROM events WHERE environment=? AND mode='daily' AND puzzle_date IS NOT NULL
    AND kind IN ('game_start','game_play','game_complete') AND day BETWEEN ? AND ?
  ) SELECT a.puzzle_date,a.hard,COUNT(*) games,COUNT(DISTINCT a.player) players,
   SUM(c.id IS NOT NULL) completions,SUM(c.id IS NULL) unfinished,
   ROUND(AVG(c.seconds)) avg_seconds,ROUND(AVG(c.mistakes),1) avg_mistakes,
   ROUND(AVG(c.word_count),1) avg_words,COALESCE(SUM(c.resumed),0) resumed
   FROM active_games a LEFT JOIN events c ON c.id='complete:'||a.session_id
    AND c.environment=a.environment AND c.kind='game_complete'
   GROUP BY a.puzzle_date,a.hard ORDER BY a.puzzle_date DESC,a.hard LIMIT 40`).bind(environment,from,today),
  env.DB.prepare(`WITH firsts AS (${firsts}), active AS (SELECT DISTINCT player,day FROM events WHERE environment=? AND kind='game_play') SELECT SUM(first_day<date(?,'-1 day')) eligible_d1,SUM(first_day<date(?,'-1 day') AND EXISTS(SELECT 1 FROM active WHERE active.player=f.player AND active.day=date(f.first_day,'+1 day'))) returned_d1,SUM(first_day<date(?,'-7 day')) eligible_d7,SUM(first_day<date(?,'-7 day') AND EXISTS(SELECT 1 FROM active WHERE active.player=f.player AND active.day=date(f.first_day,'+7 day'))) returned_d7 FROM firsts f WHERE first_day BETWEEN ? AND ?`).bind(environment,environment,today,today,today,today,from,today),
  env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN e.kind='visit' AND lower(COALESCE(e.medium,''))='organic' THEN e.player END) visitors,COUNT(DISTINCT CASE WHEN e.kind='game_play' AND lower(COALESCE(e.medium,''))='organic' THEN e.player END) players,COUNT(DISTINCT CASE WHEN e.kind='game_complete' AND lower(COALESCE(s.medium,''))='organic' THEN e.player END) finishers FROM events e LEFT JOIN events s ON e.kind='game_complete' AND s.id='start:'||substr(e.id,10) AND s.environment=e.environment WHERE e.environment=? AND e.day BETWEEN ? AND ?`).bind(environment,from,today),
  env.DB.prepare(acquisition).bind(environment,from,today,environment,environment,today,today,today,today),
  env.DB.prepare(startActivitySQL).bind(environment,from,today),
  env.DB.prepare(tutorialFunnelSQL).bind(environment,from,today,...Array(5).fill(now)),
  env.DB.prepare(tutorialLessonsSQL).bind(environment,from,today)
 ]);
 return ({environment,days,from,today,summary:results[0].results[0],daily:results[1].results,sources:results[2].results,locations:results[3].results,puzzles:results[4].results,retention:results[5].results[0],organic:results[6].results[0],acquisition:results[7].results,start_activity:results[8].results,tutorial_funnel:results[9].results[0],tutorial_lessons:results[10].results});
}