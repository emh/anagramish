const columns=['id','player','created_at','environment','entry','screen','rating','comment','app_version','session_id','mode','puzzle_date','hard','completed','player_type','first_play_day','tutorial_experiment','tutorial_variant'];
const uuid=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v);
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'));
export function validFeedback(f) {
 return f&&uuid(f.id)&&uuid(f.player)&&Number.isSafeInteger(f.created_at)&&f.created_at>0&&f.created_at<=Date.now()+60000&&
  ['preview','production'].includes(f.environment)&&['header','completion'].includes(f.entry)&&['welcome','playing','finished','history','past-game','tutorial'].includes(f.screen)&&
  [null,'easy','right','hard'].includes(f.rating)&&typeof f.comment==='string'&&f.comment.length<=1000&&(f.comment.trim()||f.rating)&&
  typeof f.app_version==='string'&&/^[a-zA-Z0-9._-]{1,64}$/.test(f.app_version)&&
  (f.session_id===null||uuid(f.session_id))&&[null,'daily','practice'].includes(f.mode)&&(f.puzzle_date===null||date(f.puzzle_date))&&
  [null,0,1].includes(f.hard)&&[null,0,1].includes(f.completed)&&['first_day','returning','not_yet_played'].includes(f.player_type)&&
  (f.first_play_day===null||date(f.first_play_day))&&[null,'tutorial-short-v1'].includes(f.tutorial_experiment)&&[null,'control','short'].includes(f.tutorial_variant);
}
export async function ingestFeedback(request,env) {
 const raw=await request.text();if(raw.length>100000)return Response.json({error:'Too large'}, {status:413});
 let feedback;try{({feedback}=JSON.parse(raw));}catch{return Response.json({error:'Invalid JSON'}, {status:400});}
 if(!Array.isArray(feedback)||!feedback.length||feedback.length>40||!feedback.every(validFeedback))return Response.json({error:'Invalid feedback'}, {status:400});
 await env.DB.batch(feedback.map(f=>env.DB.prepare(`INSERT OR IGNORE INTO feedback (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`).bind(...columns.map(k=>f[k]))));
 return Response.json({accepted:feedback.length});
}
export async function feedbackPage(url,env,now=Date.now()) {
 const environment=url.searchParams.get('environment')==='production'?'production':'preview';
 const days=[7,28,90].includes(Number(url.searchParams.get('days')))?Number(url.searchParams.get('days')):28;
 const today=new Date(now).toISOString().slice(0,10),start=Date.parse(today+'T00:00:00Z')-(days-1)*86400000;
 let cursor;
 try {cursor=JSON.parse(url.searchParams.get('cursor')??'null');}catch{return {error:'Invalid cursor',status:400};}
 if(cursor&&(!Number.isSafeInteger(cursor.at)||cursor.at>now||!uuid(cursor.id)))return {error:'Invalid cursor',status:400};
 const values=[environment,start,...(cursor?[cursor.at,cursor.id]:[now])];
 // No event scans or COUNT(*): bounded keyset pagination over the feedback index.
 const rows=(await env.DB.prepare(`SELECT ${columns.filter(c=>c!=='player').join(',')} FROM feedback
  WHERE environment=? AND created_at>=? AND ${cursor?'(created_at,id)<(?,?)':'created_at<=?'}
  ORDER BY created_at DESC,id DESC LIMIT 31`).bind(...values).all()).results;
 const items=rows.slice(0,30),last=items.at(-1);
 return {environment,from:new Date(start).toISOString().slice(0,10),today,items,next_cursor:rows.length>30?JSON.stringify({at:last.created_at,id:last.id}):null};
}
