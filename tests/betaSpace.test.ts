import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {mkdir,mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {compileBeta,readBetaBuild} from '../scripts/beta-build';
import {createBetaHandler,betaAsset,byteRange} from '../scripts/beta-server';
import type {Runner} from '../scripts/editor-security';

const sha='a'.repeat(40),id='a'.repeat(12)+'-'+'b'.repeat(12);
async function fixture(){
 const home=path.resolve('.sites-runtime');await mkdir(home,{recursive:true});const root=await mkdtemp(path.join(home,'beta-test-'));
 await writeFile(path.join(root,'package.json'),'{"version":"1.3.1"}');
 return {root,cleanup:async()=>{assert.equal(path.dirname(path.resolve(root)),home);await rm(root,{recursive:true,force:true});}};
}
function runner(dirty=()=>false):Runner{return async(command,args)=>{
 if(command==='gh')return args[0]==='api'?'FennXWeb':JSON.stringify({nameWithOwner:'FennXWeb/Nuvori-Testing',visibility:'PRIVATE'});
 const line=args.join(' ');if(line==='branch --show-current')return 'codex/testing';
 if(line==='remote get-url --push testing')return 'https://github.com/FennXWeb/Nuvori-Testing.git';
 if(line==='status --porcelain')return dirty()?' M src/game.ts':'';
 if(line==='rev-parse HEAD')return sha;
 throw new Error('Unexpected command: '+command+' '+line);
};}
const compile=async(out:string,buildId:string)=>{await writeFile(path.join(out,'index.html'),'<h1>Game</h1>');await writeFile(path.join(out,'version.json'),JSON.stringify({id:buildId}));};

test('compiled beta promotion preserves the previous game after failure or concurrent code edits',async()=>{
 const f=await fixture();try{
  assert.equal(await readBetaBuild(f.root),null);
  const current=await compileBeta({root:f.root,run:runner(),phase:()=>{},compile});assert.equal(current.sha,sha);
  assert.deepEqual(await readBetaBuild(f.root),current);
  await assert.rejects(compileBeta({root:f.root,run:runner(),phase:()=>{},compile:async()=>{throw new Error('Compiler failed');}}),/Compiler failed/);
  assert.deepEqual(await readBetaBuild(f.root),current);
  let changed=false;
  await assert.rejects(compileBeta({root:f.root,run:runner(()=>changed),phase:()=>{},compile:async(out,id)=>{await compile(out,id);changed=true;}}),/checkout changed/);
  assert.deepEqual(await readBetaBuild(f.root),current);
  assert.equal(await readFile(path.join(f.root,'.world-editor/beta/builds',current.id,'index.html'),'utf8'),'<h1>Game</h1>');
 }finally{await f.cleanup();}
});
test('beta builds reject uncommitted work and mismatched build identity without promoting it',async()=>{
 const f=await fixture();try{
  await assert.rejects(compileBeta({root:f.root,run:runner(()=>true),phase:()=>{},compile:async()=>assert.fail('Must not compile dirty code')}),/Commit your code/);
  await assert.rejects(compileBeta({root:f.root,run:runner(),phase:()=>{},compile:(out)=>compile(out,'wrong')}),/identity does not match/);
  assert.equal(await readBetaBuild(f.root),null);
 }finally{await f.cleanup();}
});
test('beta static paths reject traversal, hidden files, Windows paths, malformed escapes and unrelated URLs',()=>{
 const root=path.resolve('.world-editor/beta');
 for(const value of [`/builds/${id}/%2e%2e/current.json`,`/builds/${id}/.env`,`/builds/${id}/%5cfile`,`/builds/${id}/C:/x`,`/builds/${id}/%00x`,`/builds/${id}/%ZZ`,'/src/App.tsx','/builds/invalid/index.html'])assert.equal(betaAsset(root,value),null,value);
 assert.equal(betaAsset(root,`/builds/${id}/?x=1`),path.join(root,'builds',id,'index.html'));
 assert.deepEqual(byteRange('bytes=-3',10),{start:7,end:9});assert.equal(byteRange('bytes=10-',10),false);assert.equal(byteRange('bytes=0-1,3-4',10),false);
});
test('private beta HTTP gate, anti-rebinding checks, compiled files and seekable audio work together',async()=>{
 const f=await fixture(),home=path.join(f.root,'.world-editor/beta'),out=path.join(home,'builds',id),key='c'.repeat(64);
 await mkdir(out,{recursive:true});await compile(out,id);await writeFile(path.join(out,'sample.mp3'),'0123456789');
 let port=0;const handler=createBetaHandler(home,key,()=>port);
 const server=createServer((req,res)=>void handler(req,res));
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});port=(server.address() as {port:number}).port;
 const base=`http://127.0.0.1:${port}`,asset=`${base}/builds/${id}/`;
 try{
  assert.equal((await fetch(asset)).status,403);
  const launch=await fetch(base+'/launch');assert.equal(launch.status,200);assert.ok(!(await launch.text()).includes(key));
  const unlock=(origin:string,value=key)=>fetch(base+'/__unlock',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({key:value})});
  assert.equal((await unlock('https://attacker.example')).status,403);assert.equal((await unlock(base,'wrong')).status,403);
  const granted=await unlock(base);assert.equal(granted.status,200);const setCookie=granted.headers.get('set-cookie')!;assert.match(setCookie,/HttpOnly; SameSite=Strict/);
  const cookie=setCookie.split(';')[0],headers={Cookie:cookie};
  assert.equal(await (await fetch(asset,{headers})).text(),'<h1>Game</h1>');
  const rebound=await new Promise<number|undefined>((resolve,reject)=>{const req=request(asset,{headers:{...headers,Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});
  assert.equal(rebound,403);
  assert.equal((await fetch(base+`/builds/${id}/%2eenv`,{headers})).status,404);
  const chunk=await fetch(asset+'sample.mp3',{headers:{...headers,Range:'bytes=2-5'}});assert.equal(chunk.status,206);assert.equal(chunk.headers.get('content-range'),'bytes 2-5/10');assert.equal(await chunk.text(),'2345');
  assert.equal((await fetch(asset+'sample.mp3',{headers:{...headers,Range:'bytes=20-'}})).status,416);
  const head=await fetch(asset+'sample.mp3',{method:'HEAD',headers});assert.equal(head.headers.get('content-length'),'10');assert.equal(await head.text(),'');
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await f.cleanup();}
});
