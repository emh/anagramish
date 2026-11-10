import {TUTORIAL_EXPERIMENT,tutorialVariant} from '../../../tutorial-experiment.mjs';
const uuid=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v);
const screens=new Set(['welcome','playing','finished','history','past-game','tutorial']);
export async function saveFeedback(env,player,input,now=Date.now()) {
 const fail=(error,status=400)=>({data:{error},status});
 if(!uuid(input.id)||!['header','completion'].includes(input.entry)||!screens.has(input.screen)||
  (input.rating!=null&&!['easy','right','hard'].includes(input.rating))||typeof input.comment!=='string'||input.comment.length>1000||
  (!input.comment.trim()&&!input.rating)||typeof input.appVersion!=='string'||!/^[a-zA-Z0-9._-]{1,64}$/.test(input.appVersion)||
  (input.sessionId!=null&&!uuid(input.sessionId)))return fail('Choose a rating or write a comment (up to 1,000 characters).');
 let experiment=null,variant=null;
 if(input.tutorial!=null) {
  if(!['control','short'].includes(input.tutorial.variant)||
   (input.tutorial.experiment!=null&&input.tutorial.experiment!==TUTORIAL_EXPERIMENT)||
   (env.TRAFFIC_ENV==='production'&&(input.tutorial.experiment?input.tutorial.variant!==await tutorialVariant(player):input.tutorial.variant!=='control')))
   return fail('Invalid tutorial context. Reload and try again.');
  experiment=input.tutorial.experiment??null;variant=input.tutorial.variant;
 }
 const receipt=await env.DB.prepare('SELECT player FROM feedback_receipts WHERE id=?').bind(input.id).first();
 if(receipt)return receipt.player===player?{data:{ok:true},status:200}:fail('Invalid feedback ID.',409);
 const session=input.sessionId?await env.DB.prepare('SELECT mode,date,hard,completed_at FROM sessions WHERE id=? AND player=?').bind(input.sessionId,player).first():null;
 if(input.sessionId&&!session)return fail('This game could not be found. Return home to send general feedback.',404);
 if((input.entry==='completion'||input.rating)&&!session)return fail('Open a puzzle before rating its difficulty.');
 const first=await env.DB.prepare('SELECT started_at FROM sessions WHERE player=? ORDER BY started_at LIMIT 1').bind(player).first();
 const day=new Date(now).toISOString().slice(0,10),firstDay=first?new Date(first.started_at).toISOString().slice(0,10):null;
 const payload={id:input.id,kind:'feedback',player,created_at:now,environment:env.TRAFFIC_ENV==='production'?'production':'preview',
  entry:input.entry,screen:input.screen,rating:input.rating??null,comment:input.comment.trim(),app_version:input.appVersion,
  session_id:session?input.sessionId:null,mode:session?.mode??null,puzzle_date:session?.date??null,hard:session?.hard??null,
  completed:session?Number(session.completed_at!=null):null,player_type:!firstDay?'not_yet_played':firstDay<day?'returning':'first_day',
  first_play_day:firstDay,tutorial_experiment:experiment,tutorial_variant:variant};
 // The bounded indexed quota check and delivery record commit atomically. Keep
 // receipts after delivery so retries cannot duplicate feedback or reset quotas.
 const result=await env.DB.batch([
  env.DB.prepare(`INSERT OR IGNORE INTO feedback_receipts(id,player,created_at)
   SELECT ?,?,? WHERE (SELECT COUNT(*) FROM (SELECT 1 FROM feedback_receipts WHERE player=? AND created_at>? LIMIT 3))<3`).bind(input.id,player,now,player,now-86400000),
  env.DB.prepare(`INSERT OR IGNORE INTO outbox(id,payload,created_at)
   SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM feedback_receipts WHERE id=? AND player=?)`).bind('feedback:'+input.id,JSON.stringify(payload),now,input.id,player)
 ]);
 if(result[0].meta.changes)return {data:{ok:true},status:200};
 const concurrent=await env.DB.prepare('SELECT player FROM feedback_receipts WHERE id=?').bind(input.id).first();
 if(concurrent)return concurrent.player===player?{data:{ok:true},status:200}:fail('Invalid feedback ID.',409);
 return fail('Thanks for your feedback today. Please wait 24 hours before sending more.',429);
}
