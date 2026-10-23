// Cache additive totals and the minimum identity/timing facts needed for exact
// distinct counts, cross-day sessions, acquisition and tutorial cohorts.
// Private identifiers stay in D1; only aggregate numbers leave /api/report.
export const PART_SIZE = 500;
export function summarize(events) {
 const days=new Map();
 for(const e of events) {
  let d=days.get(e.day);
  if(!d)days.set(e.day,d={day:e.day,events:0,starts:0,tutorial_starts:0,tutorial_completions:0,last_event:0,
   visitors:new Set(),organic_visitors:new Set(),plays:[],completions:[],organic_starts:[],sessions:new Map(),start_activity:new Map(),tutorials:[],tutorial_completed:[],lessons:[],lesson_completed:[],exits:[]});
  d.events++;d.last_event=Math.max(d.last_event,e.occurred_at);
  const session=e.kind==='game_start'?e.id.slice(6):e.kind==='game_play'?e.id.slice(5,41):e.id.slice(9);
  if(e.kind==='visit') {d.visitors.add(e.player);if(e.medium?.toLowerCase()==='organic')d.organic_visitors.add(e.player);}
  if(e.kind==='game_start') {
   d.starts++;
   const key=JSON.stringify([e.player,e.mode,e.hard]);
   const a=d.start_activity.get(key)??{player:e.player,mode:e.mode,hard:e.hard,starts:0,resumed_starts:0};
   a.starts++;a.resumed_starts+=e.resumed;d.start_activity.set(key,a);
   if(e.medium?.toLowerCase()==='organic')d.organic_starts.push(session);
  }
  if(e.kind==='game_play')d.plays.push({id:e.id,player:e.player,at:e.occurred_at,session,source:e.source,referrer:e.referrer,medium:e.medium,campaign:e.campaign,country:e.country,region:e.region});
  if(e.kind==='game_complete')d.completions.push({session,player:e.player,at:e.occurred_at,seconds:e.seconds,mistakes:e.mistakes,word_count:e.word_count,resumed:e.resumed});
  if(['game_start','game_play','game_complete'].includes(e.kind)&&e.mode==='daily'&&e.puzzle_date!==null) {
   const a={session,player:e.player,puzzle_date:e.puzzle_date,hard:e.hard};d.sessions.set(JSON.stringify(a),a);
  }
  if(e.kind==='tutorial_start') {d.tutorial_starts++;d.tutorials.push({id:e.id,player:e.player,at:e.occurred_at});}
  if(e.kind==='tutorial_complete') {d.tutorial_completions++;d.tutorial_completed.push({id:e.id,player:e.player,at:e.occurred_at});}
  if(e.kind==='tutorial_lesson_start')d.lessons.push({id:e.id,player:e.player,lesson:Number(e.id.slice(-1))});
  if(e.kind==='tutorial_lesson_complete')d.lesson_completed.push([e.id,e.player]);
  if(e.kind==='tutorial_exit')d.exits.push([e.id,e.player]);
 }
 return [...days.values()].map(d=>({...d,visitors:[...d.visitors],organic_visitors:[...d.organic_visitors],sessions:[...d.sessions.values()],start_activity:[...d.start_activity.values()]}));
}
const date=at=>new Date(at).toISOString().slice(0,10);
const addDays=(day,n)=>date(Date.parse(day+'T00:00:00Z')+n*86400000);
const key=(...values)=>JSON.stringify(values);
const earlier=(a,b)=>!b||a.at<b.at||(a.at===b.at&&a.id<b.id);
const average=(rows,field,places)=>{
 const vals=rows.map(r=>r[field]).filter(v=>v!==null&&v!==undefined);
 if(!vals.length)return null;
 const value=vals.reduce((a,b)=>a+b,0)/vals.length;
 return places===undefined?value:Math.round(value*10**places)/10**places;
};
export function aggregate(summaries,{environment,days,now=Date.now()}) {
 const today=date(now),from=addDays(today,1-days),inside=day=>day>=from&&day<=today;
 const firsts=new Map(),firstTutorials=new Map(),active=new Set(),finished=new Set(),completions=new Map(),organicStarts=new Set(),tutorialCompleted=new Map(),lessonCompleted=new Set(),exits=new Set(),playerPlays=new Map(),playerCompletions=new Map();
 for(const d of summaries) {
  for(const p of d.plays) {
   const play={...p,day:d.day};if(earlier(play,firsts.get(p.player)))firsts.set(p.player,play);
   active.add(key(p.player,d.day));if(!playerPlays.has(p.player))playerPlays.set(p.player,[]);playerPlays.get(p.player).push(play);
  }
  for(const c of d.completions) {
   completions.set(c.session,c);finished.add(key(c.player,d.day));
   if(!playerCompletions.has(c.player))playerCompletions.set(c.player,[]);playerCompletions.get(c.player).push(c);
  }
  for(const s of d.organic_starts)organicStarts.add(s);
  for(const t of d.tutorials)if(earlier(t,firstTutorials.get(t.player)))firstTutorials.set(t.player,{...t,day:d.day});
  for(const t of d.tutorial_completed)tutorialCompleted.set(key(t.id,t.player),t);
  for(const t of d.lesson_completed)lessonCompleted.add(key(...t));
  for(const t of d.exits)exits.add(key(...t));
 }
 const visitors=new Set(),players=new Set(),organicVisitors=new Set(),organicPlayers=new Set(),organicFinishers=new Set(),periodCompletions=[];
 const daily=new Map(),sources=new Map(),locations=new Map(),sessions=new Map(),starts=new Map(),lessons=new Map();
 const summary={visitors:0,players:0,starts:0,completions:0,tutorial_starts:0,tutorial_completions:0,avg_seconds:null,last_event:null};
 let eventCount=0;
 for(const d of summaries.filter(d=>inside(d.day))) {
  eventCount+=d.events;
  summary.starts+=d.starts;summary.completions+=d.completions.length;summary.tutorial_starts+=d.tutorial_starts;summary.tutorial_completions+=d.tutorial_completions;
  summary.last_event=Math.max(summary.last_event??0,d.last_event);
  let row=daily.get(d.day);if(!row)daily.set(d.day,row={day:d.day,visitors:new Set(),players:new Set(),new_players:new Set(),starts:0,completions:0});
  row.starts+=d.starts;row.completions+=d.completions.length;
  for(const p of d.visitors){visitors.add(p);row.visitors.add(p);}
  for(const p of d.organic_visitors)organicVisitors.add(p);
  for(const p of d.plays) {
   players.add(p.player);row.players.add(p.player);if(firsts.get(p.player)?.day===d.day)row.new_players.add(p.player);
   if(p.medium?.toLowerCase()==='organic')organicPlayers.add(p.player);
   const source=p.source??p.referrer??'Direct / unknown',medium=p.medium??'—',campaign=p.campaign??'—',skey=key(source,medium,campaign);
   let s=sources.get(skey);if(!s)sources.set(skey,s={source,medium,campaign,players:new Set(),active_game_days:0});s.players.add(p.player);s.active_game_days++;
   const country=p.country??'Unknown',region=p.region??'Unknown',lkey=key(country,region);
   let l=locations.get(lkey);if(!l)locations.set(lkey,l={country,region,players:new Set()});l.players.add(p.player);
  }
  for(const c of d.completions){periodCompletions.push(c);if(organicStarts.has(c.session))organicFinishers.add(c.player);}
  for(const s of d.sessions)sessions.set(key(s.session,s.player,s.puzzle_date,s.hard),s);
  for(const a of d.start_activity) {
   const k=key(d.day,a.mode,a.hard);let s=starts.get(k);
   if(!s)starts.set(k,s={day:d.day,mode:a.mode,hard:a.hard,starts:0,resumed_starts:0,perPlayer:new Map()});
   s.starts+=a.starts;s.resumed_starts+=a.resumed_starts;s.perPlayer.set(a.player,(s.perPlayer.get(a.player)??0)+a.starts);
  }
  for(const l of d.lessons) {
   let r=lessons.get(l.lesson);if(!r)lessons.set(l.lesson,r={lesson:l.lesson,starts:0,completions:0,explicit_exits:0});
   r.starts++;r.completions+=Number(lessonCompleted.has(key(l.id.replace(':lesson_start:',':lesson_complete:'),l.player)));
   r.explicit_exits+=Number(exits.has(key(l.id.replace(':lesson_start:',':exit:'),l.player)));
  }
 }
 summary.visitors=visitors.size;summary.players=players.size;summary.avg_seconds=average(periodCompletions,'seconds');
 if(!eventCount)for(const k of ['starts','completions','tutorial_starts','tutorial_completions'])summary[k]=null;
 const retention={eligible_d1:0,returned_d1:0,eligible_d7:0,returned_d7:0},acquisition=new Map();let cohortSize=0;
 for(const p of firsts.values())if(inside(p.day)) {
  cohortSize++;
  const source=p.source||p.referrer||'Direct / unknown',medium=p.medium||'—',campaign=p.campaign||'—',k=key(source,medium,campaign);
  let a=acquisition.get(k);if(!a)acquisition.set(k,a={source,medium,campaign,new_players:0,eligible_first_day:0,first_day_finishers:0,eligible_d1:0,returned_d1:0});
  a.new_players++;
  if(p.day<today){a.eligible_first_day++;a.first_day_finishers+=Number(finished.has(key(p.player,p.day)));}
  for(const n of [1,7])if(addDays(p.day,n)<today) {
   retention['eligible_d'+n]++;const returned=Number(active.has(key(p.player,addDays(p.day,n))));retention['returned_d'+n]+=returned;
   if(n===1){a.eligible_d1++;a.returned_d1+=returned;}
  }
 }
 if(!cohortSize)for(const k in retention)retention[k]=null;
 const puzzles=new Map();
 for(const s of sessions.values()) {
  const k=key(s.puzzle_date,s.hard);let p=puzzles.get(k);
  if(!p)puzzles.set(k,p={puzzle_date:s.puzzle_date,hard:s.hard,games:0,players:new Set(),completed:[]});
  p.games++;p.players.add(s.player);const c=completions.get(s.session);if(c)p.completed.push(c);
 }
 const funnel={starters:0,eligible:0,eligible_previous_players:0,completed:0,played_after_completion:0,finished_after_completion:0};
 for(const t of firstTutorials.values())if(inside(t.day)) {
  funnel.starters++;if(t.at>now-86400000)continue;
  funnel.eligible++;funnel.eligible_previous_players+=Number((firsts.get(t.player)?.at??Infinity)<t.at);
  const c=tutorialCompleted.get(key(t.id.slice(0,-5)+'complete',t.player)),end=t.at+86400000;
  if(!c||c.at<t.at||c.at>=end)continue;
  funnel.completed++;
  const plays=(playerPlays.get(t.player)??[]).filter(p=>p.at>=c.at&&p.at<end);
  funnel.played_after_completion+=Number(plays.length>0);
  funnel.finished_after_completion+=Number((playerCompletions.get(t.player)??[]).some(f=>f.at>=c.at&&f.at<end&&plays.some(p=>p.session===f.session&&p.at<=f.at)));
 }
 const byText=(a,b)=>a<b?-1:a>b?1:0;
 return {environment,days,from,today,summary,
  daily:[...daily.values()].map(r=>({...r,visitors:r.visitors.size,players:r.players.size,new_players:r.new_players.size})).sort((a,b)=>byText(b.day,a.day)),
  sources:[...sources.values()].map(r=>({...r,players:r.players.size})).sort((a,b)=>b.players-a.players||byText(key(a.source,a.medium,a.campaign),key(b.source,b.medium,b.campaign))).slice(0,30),
  locations:[...locations.values()].map(r=>({...r,players:r.players.size})).sort((a,b)=>b.players-a.players||byText(key(a.country,a.region),key(b.country,b.region))).slice(0,20),
  puzzles:[...puzzles.values()].map(p=>({puzzle_date:p.puzzle_date,hard:p.hard,games:p.games,players:p.players.size,completions:p.completed.length,unfinished:p.games-p.completed.length,avg_seconds:average(p.completed,'seconds',0),avg_mistakes:average(p.completed,'mistakes',1),avg_words:average(p.completed,'word_count',1),resumed:p.completed.reduce((n,c)=>n+c.resumed,0)})).sort((a,b)=>byText(b.puzzle_date,a.puzzle_date)||(a.hard??0)-(b.hard??0)).slice(0,40),
  retention,organic:{visitors:organicVisitors.size,players:organicPlayers.size,finishers:organicFinishers.size},
  acquisition:[...acquisition.values()].sort((a,b)=>b.new_players-a.new_players||byText(a.source,b.source)||byText(a.medium,b.medium)||byText(a.campaign,b.campaign)),
  start_activity:[...starts.values()].map(({perPlayer,...r})=>({...r,players:perPlayer.size,max_starts_per_player:Math.max(...perPlayer.values())})).sort((a,b)=>byText(b.day,a.day)||byText(a.mode,b.mode)||(a.hard??0)-(b.hard??0)),
  tutorial_funnel:funnel,tutorial_lessons:[...lessons.values()].sort((a,b)=>a.lesson-b.lesson)};
}
