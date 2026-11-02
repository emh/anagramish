import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TUTORIAL_EXPERIMENT,tutorialVariant,tutorialChoice} from '../../../tutorial-experiment.mjs';
import {tutorialLessons,checkTutorialWord} from '../../../tutorial.mjs';
import {compareWords} from '../../../utils.js';
import {summarize,aggregate} from '../../analytics/server/daily-summary.mjs';
import {wilson} from '../../analytics/server/tutorial-experiment.mjs';

const now=Date.parse('2026-11-02T12:00:00Z'),day=at=>new Date(at).toISOString().slice(0,10),ago=n=>now-n*86400000;
const player=n=>`${String(n).padStart(8,'0')}-0000-0000-0000-000000000000`;
function tutorial(p,attempt,action,at,variant='control',extra={}) {
 return {id:`tutorial:${player(p)}:${attempt}:${action}`,kind:'tutorial_'+action,player:player(p),occurred_at:at,day:day(at),mode:'tutorial',resumed:0,experiment:TUTORIAL_EXPERIMENT,variant,...extra};
}
function game(p,kind,at,n=p) {
 const id=player(n),prefix=kind==='game_play'?'play':'complete';
 return {id:`${prefix}:${id}${kind==='game_play'?':'+day(at):''}`,kind,player:player(p),occurred_at:at,day:day(at),mode:'practice',puzzle_date:null,resumed:0,seconds:60};
}
function report(events,days=28,time=now) {
 // Separate cache parts reproduce events arriving after an earlier summary.
 const summaries=events.flatMap(e=>summarize([e]));
 return aggregate(summaries,{environment:'production',days,now:time}).tutorial_experiment;
}
test('assignment is stable, approximately balanced, and production cannot be forced through a URL',async()=>{
 let short=0;
 for(let i=0;i<1000;i++){const a=await tutorialVariant(player(i));assert.equal(await tutorialVariant(player(i)),a);short+=Number(a==='short');}
 assert.ok(short>440&&short<560,`short assignment count ${short}`);
 const config={trafficEnvironment:'production',tutorialExperiment:{id:TUTORIAL_EXPERIMENT,variant:'control'}};
 assert.deepEqual(tutorialChoice(config,'?tutorial-variant=short'),{variant:'control',experiment:TUTORIAL_EXPERIMENT});
 assert.deepEqual(tutorialChoice({...config,trafficEnvironment:'preview'},'?tutorial-variant=short'),{variant:'short',experiment:null});
 assert.deepEqual(tutorialChoice({}),{variant:'control',experiment:null});
});
test('short tutorial teaches a legal replacement and rearrangement, then connects to its filled end word',()=>{
 const [lesson]=tutorialLessons('short');assert.equal(tutorialLessons('short').length,1);assert.equal(tutorialLessons('control').length,3);
 assert.equal(checkTutorialWord(0,0,'tar','short'),null);
 assert.match(checkTutorialWord(0,0,'act','short'),/exactly one letter/);
 assert.match(checkTutorialWord(0,0,'car','short'),/guided step/);
 for(let i=1;i<lesson.path.length;i++)assert.equal(compareWords(lesson.path[i-1],lesson.path[i]),2);
 assert.equal(lesson.path.length-2,1);
});
test('trial includes skippers, excludes prior play and replay, matches outcomes, and waits for maturity',()=>{
 const events=[
  tutorial(1,'a','start',ago(3)), // skips but plays: still a primary success
  game(1,'game_play',ago(3)+1000),game(1,'game_complete',ago(3)+2000),game(1,'game_play',ago(2),100),
  tutorial(2,'b','start',ago(3),'short'),tutorial(2,'b','complete',ago(3)+1000,'short'),
  game(2,'game_play',ago(3)+2000),game(2,'game_complete',ago(3)+3000),
  tutorial(3,'c','start',ago(3),'short'), // tutorial complete but game only outside 24h
  tutorial(3,'c','complete',ago(3)+500,'short'),game(3,'game_play',ago(1)),
  tutorial(4,'d','start',ago(.5),'short'),game(4,'game_play',ago(.4)),
  game(5,'game_play',ago(5)),tutorial(5,'e','start',ago(3)), // existing player excluded
  tutorial(6,'old','start',ago(5),'control',{experiment:null,variant:null}),tutorial(6,'new','start',ago(3),'short'),
  tutorial(7,'first','start',ago(4)),tutorial(7,'replay','start',ago(3),'short'),tutorial(7,'replay','complete',ago(3)+100),
  tutorial(8,'old-window','start',ago(40),'short'),game(8,'game_play',ago(40)+1000),
  tutorial(9,'unrelated','start',ago(3)),game(9,'game_complete',ago(3)+1000) // completion without matching play
 ];
 const r=report(events),a=r.rows[0],b=r.rows[1];
 assert.equal(r.scope,'lifetime');assert.equal(r.previous_players_excluded,1);
 assert.deepEqual({...a,played_interval:null},{variant:'control',enrolled:3,eligible:3,awaiting_24h:0,tutorial_completed:0,played:1,finished:1,eligible_d1:3,returned_d1:1,played_interval:null});
 assert.deepEqual({...b,played_interval:null},{variant:'short',enrolled:4,eligible:3,awaiting_24h:1,tutorial_completed:2,played:2,finished:1,eligible_d1:3,returned_d1:0,played_interval:null});
 assert.deepEqual(report(events,7),r,'period selector must not discard older trial learners');
 assert.equal(report(events,28,now+86400000).rows[1].eligible,4);
 assert.ok(!JSON.stringify(r).includes(player(1)),'browser IDs never leave the report');
});
test('late earlier events can exclude a learner and interval estimates remain honest at low counts',()=>{
 const events=[tutorial(1,'a','start',ago(3)),game(1,'game_play',ago(2.5))];
 assert.equal(report(events).rows[0].played,1);
 events.push(game(1,'game_play',ago(4),2));
 assert.equal(report(events).rows[0].enrolled,0);
 assert.equal(wilson(0,0),null);assert.ok(wilson(1,1).lower<.21);assert.ok(wilson(0,1).upper>.79);
});
