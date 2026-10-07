import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {setup} from '../scripts/local.mjs';
import {signPlayer,verifyPlayer} from '../server/player-token.mjs';
import {authorized} from '../../analytics/server/access.mjs';

let app;
const origin='https://anagramish.com';
before(async()=>{app=await setup({production:true});});
after(async()=>{await app?.dispose();});
const request=(path,options={})=>app.game.dispatchFetch('https://game.test'+path,{...options,headers:{Origin:origin,...options.headers}});
test('production supports cookie-free sessions and only the configured frontend origin',async()=>{
    const preflight=await request('/api/start',{method:'OPTIONS',headers:{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});
    assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
    const config=await request('/api/config');assert.equal(config.headers.get('set-cookie'),null);
    assert.equal(config.headers.get('access-control-allow-origin'),origin);
    const {playerToken}=await config.json();assert.ok(playerToken);
    const headers={Authorization:`Bearer ${playerToken}`,'Content-Type':'application/json'};
    const id=crypto.randomUUID(),body=JSON.stringify({id,mode:'practice',hard:false,savedPair:['caulk','horse']});
    assert.equal((await request('/api/start',{method:'POST',headers,body})).status,200);
    const reload=await request('/api/config',{headers});
    const renewed=(await reload.json()).playerToken;
    assert.equal(renewed.split('.')[0],playerToken.split('.')[0]);
    assert.equal((await request('/api/start',{method:'POST',headers:{...headers,Authorization:`Bearer ${renewed}`},body})).status,200);
    const other=(await (await request('/api/config')).json()).playerToken;
    assert.equal((await request('/api/start',{method:'POST',headers:{...headers,Authorization:`Bearer ${other}`},body})).status,403);
    assert.equal((await request('/api/start',{method:'POST',headers:{'Content-Type':'application/json',Cookie:`anagramish_player=${playerToken.split('.')[0]}`},body})).status,401);
    const complete=await request('/api/complete',{method:'POST',headers,body:JSON.stringify({id,words:['lacks','hacks','shake','share'],seconds:40,mistakes:0})});
    assert.equal((await complete.json()).saved,true);
    let delivered;
    for(let i=0;i<25;i++){
        delivered=await app.analyticsDb.prepare('SELECT environment FROM events WHERE id=?').bind('complete:'+id).first();
        if(delivered)break;await new Promise(resolve=>setTimeout(resolve,100));
    }
    assert.equal(delivered?.environment,'production');
    const foreign=await request('/api/config',{headers:{Origin:'https://evil.test'}});
    assert.equal(foreign.status,403);assert.equal(foreign.headers.get('access-control-allow-origin'),null);
});
test('player credentials reject forged identities, tampering, wrong keys and expiry',async()=>{
    const secret='a-test-secret-that-is-longer-than-32-characters';
    const player=crypto.randomUUID(),token=await signPlayer(player,secret);
    assert.equal(await verifyPlayer(token,secret),player);
    assert.equal(await verifyPlayer(token.replace(player,crypto.randomUUID()),secret),null);
    assert.equal(await verifyPlayer(token,secret+'wrong'),null);
    assert.equal(await verifyPlayer(token,secret,Date.now()+31636000000),null);
    assert.equal(await verifyPlayer('malformed',secret),null);
});
test('Cloudflare dashboard verifies signed Access claims and ignores forged email headers',async()=>{
    const env={AUTH_MODE:'access',ADMIN_EMAIL:'owner@example.test',ACCESS_ISSUER:'https://test-team.cloudflareaccess.com',ACCESS_AUD:'test-audience'};
    const key=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
    const jwk={...await crypto.subtle.exportKey('jwk',key.publicKey),kid:'test-key'};
    const fetchKeys=async()=>Response.json({keys:[jwk]});
    const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
    async function signed(overrides={}) {
        const claims={iss:env.ACCESS_ISSUER,aud:[env.ACCESS_AUD],email:env.ADMIN_EMAIL,iat:Math.floor(Date.now()/1000)-1,exp:Math.floor(Date.now()/1000)+300,...overrides};
        const data=encode({alg:'RS256',kid:'test-key'})+'.'+encode(claims);
        return data+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key.privateKey,new TextEncoder().encode(data))).toString('base64url');
    }
    const req=token=>new Request('https://analytics.test/',{headers:{'cf-access-jwt-assertion':token,'oai-authenticated-user-email':env.ADMIN_EMAIL}});
    assert.equal(await authorized(req(await signed()),env,fetchKeys),true);
    for(const claims of [{aud:['other']},{iss:'https://wrong.cloudflareaccess.com'},{email:'attacker@example.test'},{exp:1},{nbf:Date.now()/1000+1000}])assert.equal(await authorized(req(await signed(claims)),env,fetchKeys),false);
    const token=await signed();const parts=token.split('.');parts[1]=encode({email:env.ADMIN_EMAIL});
    assert.equal(await authorized(req(parts.join('.')),env,fetchKeys),false);
    assert.equal(await authorized(req(''),env,fetchKeys),false);
    assert.equal(await authorized(req(await signed()),{...env,ACCESS_AUD:''},fetchKeys),false);
    assert.equal(await authorized(req(''),{ADMIN_EMAIL:env.ADMIN_EMAIL},fetchKeys),false);
});
