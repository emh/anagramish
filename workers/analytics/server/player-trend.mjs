const DAY=86400000;
const addDays=(day,n)=>new Date(Date.parse(day+'T00:00:00Z')+n*DAY).toISOString().slice(0,10);

// Match the daily chart's unique browsers per UTC day (daily + practice), but
// smooth over complete weeks. Read retained summary facts, never raw events.
export function playerTrend(summaries,{from,today,firstRecordedDay}) {
 const result={method:'simple_moving_average',window_days:7,scope:'daily_and_practice',
  completed_tracked_days:firstRecordedDay?Math.max(0,(Date.parse(today)-Date.parse(firstRecordedDay))/DAY):0,
  points:[]};
 if(!firstRecordedDay)return result;
 const earliest=addDays(firstRecordedDay,6),start=earliest>from?earliest:from;
 if(start>=today)return result;
 const lookback=addDays(start,-6),players=new Map();
 for(const d of summaries) {
  if(d.day<lookback||d.day>=today)continue;
  let unique=players.get(d.day);if(!unique)players.set(d.day,unique=new Set());
  for(const p of d.plays)unique.add(p.player);
 }
 for(let day=start;day<today;day=addDays(day,1)) {
  let playerDays=0;
  for(let offset=0;offset<7;offset++)playerDays+=players.get(addDays(day,-offset))?.size??0;
  result.points.push({day,window_from:addDays(day,-6),player_days:playerDays,average_daily_players:playerDays/7});
 }
 return result;
}
