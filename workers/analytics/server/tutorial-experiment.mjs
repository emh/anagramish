import {TUTORIAL_EXPERIMENT,TUTORIAL_VARIANTS} from '../../../tutorial-experiment.mjs';

const DAY=86400000;
const utcDay=at=>new Date(at).toISOString().slice(0,10);
const key=(...values)=>JSON.stringify(values);
export function wilson(successes,total) {
 if(!total)return null;
 const z=1.959963984540054,p=successes/total,denominator=1+z*z/total;
 const center=(p+z*z/(2*total))/denominator;
 const radius=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/denominator;
 return {lower:Math.max(0,center-radius),upper:Math.min(1,center+radius)};
}
// This experiment needs months at current traffic. Its lifetime cohort must not
// disappear when a learner ages out of the dashboard's 7/28/90-day window.
export function tutorialExperimentReport({firstTutorials,firsts,playerPlays,playerCompletions,tutorialCompleted,active,now}) {
 const rows=TUTORIAL_VARIANTS.map(variant=>({variant,enrolled:0,eligible:0,awaiting_24h:0,tutorial_completed:0,played:0,finished:0,eligible_d1:0,returned_d1:0}));
 let startedAt=null,lastEnrolledAt=null,previousPlayersExcluded=0;
 for(const t of firstTutorials.values()) {
  if(t.experiment!==TUTORIAL_EXPERIMENT||!TUTORIAL_VARIANTS.includes(t.variant)||t.at>now)continue;
  if((firsts.get(t.player)?.at??Infinity)<t.at){previousPlayersExcluded++;continue;}
  const row=rows.find(r=>r.variant===t.variant),end=t.at+DAY;
  row.enrolled++;startedAt=Math.min(startedAt??t.at,t.at);lastEnrolledAt=Math.max(lastEnrolledAt??t.at,t.at);
  if(end>now){row.awaiting_24h++;continue;}
  row.eligible++;
  const completion=tutorialCompleted.get(key(t.id.slice(0,-5)+'complete',t.player));
  row.tutorial_completed+=Number(!!completion&&completion.at>=t.at&&completion.at<end);
  // Intention to treat: include skipped and abandoned tutorials in the denominator
  // and count a subsequent game even when the tutorial wasn't completed.
  const plays=(playerPlays.get(t.player)??[]).filter(p=>p.at>=t.at&&p.at<end);
  row.played+=Number(plays.length>0);
  row.finished+=Number((playerCompletions.get(t.player)??[]).some(c=>c.at>=t.at&&c.at<end&&plays.some(p=>p.session===c.session&&p.at<=c.at)));
  const returnDay=utcDay(Date.parse(t.day+'T00:00:00Z')+DAY);
  if(returnDay<utcDay(now)){row.eligible_d1++;row.returned_d1+=Number(active.has(key(t.player,returnDay)));}
 }
 return {id:TUTORIAL_EXPERIMENT,scope:'lifetime',primary_metric:'played_within_24h',target_per_variant:100,
  started_at:startedAt,last_enrolled_at:lastEnrolledAt,previous_players_excluded:previousPlayersExcluded,
  rows:rows.map(r=>({...r,played_interval:wilson(r.played,r.eligible)}))};
}
