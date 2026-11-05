const key=(...values)=>JSON.stringify(values);
const earlier=(a,b)=>!b||a.at<b.at||(a.at===b.at&&a.id<b.id);
const byText=(a,b)=>a<b?-1:a>b?1:0;

// All required facts already exist in cached summary parts. Never query raw
// events here or rebuild historical parts when adding a report projection.
function gameOverview(summaries,day,mode,sessionMode) {
 const firsts=new Map(),firstToday=new Map(),finished=new Map(),starts=new Map();
 let gameStarts=0;
 for(const d of summaries)for(const p of d.plays)if(sessionMode(p.session)===mode&&earlier(p,firsts.get(p.player)))firsts.set(p.player,{...p,day:d.day});
 for(const d of summaries) {
  if(d.day!==day)continue;
  for(const p of d.plays)if(sessionMode(p.session)===mode&&earlier(p,firstToday.get(p.player)))firstToday.set(p.player,p);
  for(const c of d.completions)if(sessionMode(c.session)===mode)finished.set(c.session,c);
  for(const a of d.start_activity) {
   if(a.mode!==mode)continue;gameStarts+=a.starts;
   const k=key(a.mode,a.hard);let row=starts.get(k);
   if(!row)starts.set(k,row={mode:a.mode,hard:a.hard,starts:0,perPlayer:new Map()});
   row.starts+=a.starts;row.perPlayer.set(a.player,(row.perPlayer.get(a.player)??0)+a.starts);
  }
 }
 const sources=new Map(),locations=new Map();let newPlayers=0;
 for(const p of firstToday.values()) {
  const isNew=firsts.get(p.player)?.day===day;newPlayers+=Number(isNew);
  // One source and location per player: first recorded game activity today.
  // Later sessions cannot count a browser twice or change its day's bucket.
  const source=p.source||p.referrer||'Direct / unknown',medium=p.medium||'—',campaign=p.campaign||'—';
  const country=p.country||'Unknown',region=p.region||'Unknown';
  for(const [map,k,fields] of [[sources,key(source,medium,campaign),{source,medium,campaign}],[locations,key(country,region),{country,region}]]) {
   let row=map.get(k);if(!row)map.set(k,row={...fields,players:0,new_players:0,returning_players:0});
   row.players++;row.new_players+=Number(isNew);row.returning_players+=Number(!isNew);
  }
 }
 const completions=[...finished.values()],times=completions.map(c=>c.seconds).filter(n=>Number.isFinite(n));
 return {players:firstToday.size,new_players:newPlayers,
  returning_players:firstToday.size-newPlayers,starts:gameStarts,completions:finished.size,
  finishers:new Set(completions.map(c=>c.player)).size,
  avg_seconds:times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length):null,
  sources:[...sources.values()].sort((a,b)=>b.players-a.players||byText(key(a.source,a.medium,a.campaign),key(b.source,b.medium,b.campaign))),
  locations:[...locations.values()].sort((a,b)=>b.players-a.players||byText(key(a.country,a.region),key(b.country,b.region))),
  game_starts:[...starts.values()].map(({perPlayer,...r})=>({...r,players:perPlayer.size,max_starts_per_player:Math.max(0,...perPlayer.values())})).sort((a,b)=>byText(a.mode,b.mode)||(a.hard??0)-(b.hard??0))};
}


export function todayOverview(summaries,day) {
 // Legacy summary parts already identify daily sessions, including completion-only
 // delivery. Other game sessions are practice; no historical rebuild is needed.
 const dailySessions=new Set(summaries.flatMap(d=>d.sessions.map(s=>s.session)));
 const sessionMode=session=>dailySessions.has(session)?'daily':'practice';
 const visitors=new Set(),attempts=new Map();let lastEvent=null;
 const tutorials=['control','short','unassigned'].map(variant=>({variant,starts:0,completions:0}));
 for(const d of summaries)for(const t of d.tutorials)attempts.set(key(t.id,t.player),t);
 const variant=t=>t?.experiment==='tutorial-short-v1'&&['control','short'].includes(t.variant)?t.variant:'unassigned';
 for(const d of summaries)if(d.day===day) {
  d.visitors.forEach(p=>visitors.add(p));lastEvent=Math.max(lastEvent??0,d.last_event);
  for(const t of d.tutorials)tutorials.find(r=>r.variant===variant(t)).starts++;
  for(const c of d.tutorial_completed) {
   const t=attempts.get(key(c.id.replace(/:complete$/,':start'),c.player));
   tutorials.find(r=>r.variant===variant(t)).completions++;
  }
 }
 return {day,timezone:'UTC',visitors:visitors.size,last_event:lastEvent,
  daily:gameOverview(summaries,day,'daily',sessionMode),
  practice:gameOverview(summaries,day,'practice',sessionMode),tutorials};
}
