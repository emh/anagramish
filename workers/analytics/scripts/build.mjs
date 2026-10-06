import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});
await build({entryPoints:['server/index.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',loader:{'.html':'text'},minify:true});
await writeFile('dist/server/wrangler.json',JSON.stringify({name:'anagramish-analytics',main:'index.js',compatibility_date:'2026-08-01',d1_databases:[{binding:'DB',database_name:'anagramish-analytics',database_id:'local-analytics',migrations_dir:'../../drizzle'}]},null,2));
console.log('Built private analytics Worker.');
