// Read-only diagnostics over existing events; no player identifiers leave the report.
export const startActivitySQL = `WITH per_player AS (
 SELECT day,mode,hard,player,COUNT(*) starts,SUM(resumed) resumed_starts
 FROM events WHERE environment=? AND kind='game_start' AND day BETWEEN ? AND ?
 GROUP BY day,mode,hard,player
)
SELECT day,mode,hard,SUM(starts) starts,COUNT(*) players,
 MAX(starts) max_starts_per_player,SUM(resumed_starts) resumed_starts
FROM per_player GROUP BY day,mode,hard ORDER BY day DESC,mode,hard`;

// One first tutorial attempt per browser, with a full 24 hours to observe outcomes.
// Join the completion by attempt ID so replaying cannot complete an earlier attempt.
export const tutorialFunnelSQL = `WITH ranked AS (
 SELECT *,ROW_NUMBER() OVER (PARTITION BY player ORDER BY occurred_at,id) rank
 FROM events WHERE environment=? AND kind='tutorial_start'
), cohort AS (
 SELECT * FROM ranked WHERE rank=1 AND day BETWEEN ? AND ?
), outcomes AS (
 SELECT t.*,c.occurred_at completed_at,
 EXISTS(SELECT 1 FROM events e WHERE e.environment=t.environment AND e.player=t.player
  AND e.kind='game_play' AND e.occurred_at<t.occurred_at) previously_played
 FROM cohort t LEFT JOIN events c ON c.environment=t.environment AND c.player=t.player
  AND c.id=substr(t.id,1,length(t.id)-5)||'complete' AND c.kind='tutorial_complete'
  AND c.occurred_at>=t.occurred_at AND c.occurred_at<t.occurred_at+86400000
)
SELECT COUNT(*) starters,
 COALESCE(SUM(occurred_at<=?-86400000),0) eligible,
 COALESCE(SUM(occurred_at<=?-86400000 AND previously_played),0) eligible_previous_players,
 COALESCE(SUM(occurred_at<=?-86400000 AND completed_at IS NOT NULL),0) completed,
 COALESCE(SUM(occurred_at<=?-86400000 AND completed_at IS NOT NULL AND EXISTS(
  SELECT 1 FROM events e WHERE e.environment=t.environment AND e.player=t.player
   AND e.kind='game_play' AND e.occurred_at>=t.completed_at AND e.occurred_at<t.occurred_at+86400000
 )),0) played_after_completion,
 COALESCE(SUM(occurred_at<=?-86400000 AND completed_at IS NOT NULL AND EXISTS(
  SELECT 1 FROM events e WHERE e.environment=t.environment AND e.player=t.player
   AND e.kind='game_complete' AND e.occurred_at>=t.completed_at AND e.occurred_at<t.occurred_at+86400000
   AND EXISTS(SELECT 1 FROM events p WHERE p.environment=e.environment AND p.player=e.player
    AND p.kind='game_play' AND substr(p.id,6,36)=substr(e.id,10)
    AND p.occurred_at>=t.completed_at AND p.occurred_at<=e.occurred_at)
 )),0) finished_after_completion
FROM outcomes t`;

// Lesson number is a validated 1–3 suffix on the attempt event ID.
// Restrict to instrumented lesson starts, so old tutorial completions are not dropoffs.
export const tutorialLessonsSQL = `WITH starts AS (
 SELECT * FROM events WHERE environment=? AND kind='tutorial_lesson_start'
 AND day BETWEEN ? AND ?
)
SELECT CAST(substr(s.id,-1) AS INTEGER) lesson,COUNT(*) starts,
 SUM(c.id IS NOT NULL) completions,SUM(x.id IS NOT NULL) explicit_exits
FROM starts s LEFT JOIN events c ON c.environment=s.environment AND c.player=s.player
 AND c.id=replace(s.id,':lesson_start:',':lesson_complete:') AND c.kind='tutorial_lesson_complete'
LEFT JOIN events x ON x.environment=s.environment AND x.player=s.player
 AND x.id=replace(s.id,':lesson_start:',':exit:') AND x.kind='tutorial_exit'
GROUP BY lesson ORDER BY lesson`;
