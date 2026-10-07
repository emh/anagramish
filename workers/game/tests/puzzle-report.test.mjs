import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {setup} from '../scripts/local.mjs';

let app;
before(async()=>{app=await setup();});
after(async()=>{await app?.dispose();});
const ago=days=>Date.now()-days*86400000;
const date=timestamp=>new Date(timestamp).toISOString().slice(0,10);
function event(kind,id,{at=ago(0),player=crypto.randomUUID(),puzzleDate='2026-10-01',hard=0,mode='daily',environment='production',...extra}={}) {
    const day=date(at);
    const prefix={game_start:'start',game_play:'play',game_complete:'complete'}[kind];
    return {id:`${prefix}:${id}${kind==='game_play'?':'+day:''}`,kind,player,occurredAt:at,day,puzzleDate,hard,mode,environment,...extra};
}
async function ingest(events){
    const response=await app.analytics.dispatchFetch('https://analytics.test/ingest',{method:'POST',headers:{Authorization:'Bearer local-intake-token','Content-Type':'application/json'},body:JSON.stringify({events})});
    assert.equal(response.status,200);
}
async function report(){
    const response=await app.analytics.dispatchFetch('https://analytics.test/api/report?environment=production&days=7',{headers:{'oai-authenticated-user-email':'owner@example.test'}});
    assert.equal(response.status,200);return (await response.json()).puzzles;
}
test('daily results include unfinished sessions, deduplicate reopens, and average only completed games',async()=>{
    const finished=crypto.randomUUID(),unfinished=crypto.randomUUID(),owner=crypto.randomUUID();
    const base={player:owner};
    const events=[
        event('game_start',finished,base),event('game_play',finished,base),
        event('game_complete',finished,{...base,seconds:60,mistakes:2,wordCount:4}),
        event('game_start',unfinished,{at:ago(2),...base}),
        event('game_play',unfinished,{at:ago(2),...base}),event('game_play',unfinished,base)
    ];
    await ingest(events);await ingest(events);
    let row=(await report()).find(r=>r.puzzle_date==='2026-10-01');
    assert.deepEqual(row,{puzzle_date:'2026-10-01',hard:0,games:2,players:1,completions:1,unfinished:1,avg_seconds:60,avg_mistakes:2,avg_words:4,resumed:0});
    await ingest([event('game_complete',unfinished,{...base,seconds:120,mistakes:0,wordCount:6})]);
    row=(await report()).find(r=>r.puzzle_date==='2026-10-01');
    assert.equal(row.games,2);assert.equal(row.completions,2);assert.equal(row.unfinished,0);assert.equal(row.avg_seconds,90);
});
test('unfinished-only puzzles appear, including old sessions resumed within the period',async()=>{
    const resumed=crypto.randomUUID(),idle=crypto.randomUUID(),hard=crypto.randomUUID(),player=crypto.randomUUID();
    await ingest([
        event('game_start',resumed,{player,at:ago(10),puzzleDate:'2026-09-01'}),
        event('game_play',resumed,{player,puzzleDate:'2026-09-01'}),
        event('game_start',idle,{at:ago(10),puzzleDate:'2026-09-02'}),
        event('game_start',hard,{player,puzzleDate:'2026-09-01',hard:1}),
        event('game_start',crypto.randomUUID(),{puzzleDate:'2026-09-03',environment:'preview'}),
        event('game_start',crypto.randomUUID(),{puzzleDate:'2026-09-04',mode:'practice'})
    ]);
    const rows=await report();
    for(const mode of [0,1]){
        const row=rows.find(r=>r.puzzle_date==='2026-09-01'&&r.hard===mode);
        assert.equal(row.games,1);assert.equal(row.unfinished,1);assert.equal(row.completions,0);assert.equal(row.avg_seconds,null);
    }
    for(const day of ['2026-09-02','2026-09-03','2026-09-04'])assert.equal(rows.some(r=>r.puzzle_date===day),false);
});
test('completion-only delivery still appears while its earlier start is delayed or outside the period',async()=>{
    await ingest([event('game_complete',crypto.randomUUID(),{puzzleDate:'2026-09-05',seconds:75,mistakes:1,wordCount:4})]);
    const row=(await report()).find(r=>r.puzzle_date==='2026-09-05');
    assert.equal(row.games,1);assert.equal(row.completions,1);assert.equal(row.unfinished,0);assert.equal(row.avg_seconds,75);
});
