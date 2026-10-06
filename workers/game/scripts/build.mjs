import { build } from 'esbuild';
import { rm,mkdir,cp,writeFile,readFile } from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});
await mkdir('dist/client',{recursive:true});
for(const file of ['index.html','style.css','main.mjs','html.mjs','utils.js','tutorial.mjs','acquisition.mjs','favicon.svg','anagramish.png','how-to-play.html','guide.css','robots.txt','sitemap.xml'])await cp('../../'+file,'dist/client/'+file);
await build({entryPoints:['server/index.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',loader:{'.txt':'text'},minify:true});
await writeFile('dist/server/wrangler.json',JSON.stringify({name:'anagramish-preview',main:'index.js',compatibility_date:'2026-08-01',assets:{directory:'../client',binding:'ASSETS',run_worker_first:true},d1_databases:[{binding:'DB',database_name:'anagramish-game',database_id:'local-game',migrations_dir:'../../drizzle'}]},null,2));
const hosting=JSON.parse(await readFile('.openai/hosting.json','utf8'));delete hosting.static;hosting.d1='DB';await writeFile('.openai/hosting.json',JSON.stringify(hosting,null,2)+'\n');
console.log('Built Worker and public assets. Word lists are server-only.');
