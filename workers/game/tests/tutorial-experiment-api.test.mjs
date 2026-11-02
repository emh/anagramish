import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setup} from '../scripts/local.mjs';
import {TUTORIAL_EXPERIMENT} from '../../../tutorial-experiment.mjs';

test('config assigns persistently and accepted experiment events reach D1 summaries exactly once',async()=>{
 const app=await setup({production:true,tutorialExperiment:TUTORIAL_EXPERIMENT});
 try {
  const config=await (await app.game.dispatchFetch('https://game.test/api/config')).json();
  const assignment=config.tutorialExperiment;
  assert.equal(assignment.id,TUTORIAL_EXPERIMENT);
  const headers={Authorization:`Bearer ${config.playerToken}`,Origin:'https://anagramish.com','Content-Type':'application/json'};
  const again=await (await app.game.dispatchFetch('https://game.test/api/config',{headers})).json();
  assert.deepEqual(again.tutorialExperiment,assignment);
  const id=crypto.randomUUID(),payload={id,action:'start',experiment:assignment.id,variant:assignment.variant};
  const send=body=>app.game.dispatchFetch('https://game.test/api/tutorial',{method:'POST',headers,body:JSON.stringify(body)});
  assert.equal((await send({...payload,variant:assignment.variant==='short'?'control':'short'})).status,400);
  assert.equal((await send({...payload,experiment:'made-up-test'})).status,400);
  assert.equal((await send({...payload,action:'lesson_start',lesson:assignment.variant==='short'?2:4})).status,400);
  assert.equal((await send(payload)).status,200);assert.equal((await send(payload)).status,200);
  let row;
  for(let i=0;i<30;i++){
   row=await app.analyticsDb.prepare("SELECT experiment,variant FROM events WHERE kind='tutorial_start'").first();
   if(row)break;await new Promise(r=>setTimeout(r,100));
  }
  assert.deepEqual(row,{experiment:assignment.id,variant:assignment.variant});
  assert.equal((await app.analyticsDb.prepare('SELECT COUNT(*) n FROM events').first()).n,1);
  const report=await (await app.analytics.dispatchFetch('https://analytics.test/api/report?environment=production',{headers:{'oai-authenticated-user-email':'owner@example.test'}})).json();
  const cohort=report.tutorial_experiment.rows.find(r=>r.variant===assignment.variant);
  assert.equal(cohort.enrolled,1);assert.equal(cohort.eligible,0);assert.equal(cohort.awaiting_24h,1);
  assert.equal(report.summary.tutorial_starts,1);
 }finally{await app.dispose();}
});
test('disabling assignment leaves legacy offline tutorials working',async()=>{
 const app=await setup({production:true});
 try {
  const config=await (await app.game.dispatchFetch('https://game.test/api/config')).json();
  assert.equal(config.tutorialExperiment,null);
  const response=await app.game.dispatchFetch('https://game.test/api/tutorial',{method:'POST',headers:{Authorization:`Bearer ${config.playerToken}`,'Content-Type':'application/json'},body:JSON.stringify({id:crypto.randomUUID(),action:'start'})});
  assert.equal(response.status,200);
 }finally{await app.dispose();}
});
