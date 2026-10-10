import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,type RequestListener} from 'node:http';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import path from 'node:path';
import {findRunningStudio,waitForRunningStudio,isPortConflict,studioLaunchError,openStudioPage} from '../scripts/studio-launch';
import {OWNER,REPOSITORY,BRANCH} from '../scripts/editor-security';

const key='c'.repeat(64);
const identity={owner:OWNER,repository:REPOSITORY,branch:BRANCH,document:{schema:1,cells:{}},revision:'a'.repeat(64)};
async function fixture(handler:RequestListener){
 const home=path.resolve('.sites-runtime');await mkdir(home,{recursive:true});
 const root=await mkdtemp(path.join(home,'studio-launch-')),file=path.join(root,'session.json');
 const server=createServer(handler);
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const port=(server.address() as {port:number}).port,origin=`http://127.0.0.1:${port}`;
 const save=(url=`${origin}/beta.html#${key}`)=>writeFile(file,JSON.stringify({url}));
 return {file,port,origin,save,cleanup:async()=>{
  server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));
  assert.equal(path.dirname(root),home);await rm(root,{recursive:true,force:true});
 }};
}

test('reopening either launcher authenticates and reuses the existing session without replacing its key',async()=>{
 let requests=0;
 const f=await fixture((req,res)=>{
  requests++;assert.equal(req.url,'/__studio/session');assert.equal(req.headers['x-nuvori-editor-key'],key);
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(identity));
 });
 try{
  await f.save();const before=await readFile(f.file,'utf8');
  assert.equal(await findRunningStudio(f.file,'editor',f.port),`${f.origin}/editor.html#${key}`);
  assert.equal(await findRunningStudio(f.file,'beta',f.port),`${f.origin}/beta.html#${key}`);
  assert.equal(await readFile(f.file,'utf8'),before);assert.equal(requests,2);
 }finally{await f.cleanup();}
});

test('missing, malformed and non-loopback session links cannot send the saved key anywhere',async()=>{
 let requests=0;const f=await fixture((_req,res)=>{requests++;res.end('{}');});
 try{
  assert.equal(await findRunningStudio(f.file,'editor',f.port),null);
  await writeFile(f.file,'{broken');assert.equal(await findRunningStudio(f.file,'editor',f.port),null);
  for(const url of [`https://example.com/editor.html#${key}`,`${f.origin}/other.html#${key}`,`${f.origin}/editor.html?redirect=x#${key}`,`${f.origin}/editor.html#short`,`${f.origin.replace('http://','http://user@')}/editor.html#${key}`]){
   await f.save(url);assert.equal(await findRunningStudio(f.file,'editor',f.port),null);
  }
  assert.equal(requests,0);
 }finally{await f.cleanup();}
});

test('a stale key, unrelated listener, mismatched identity or malformed response is not reused',async()=>{
 let status=403,body:unknown=identity;
 const f=await fixture((_req,res)=>{res.statusCode=status;res.end(typeof body==='string'?body:JSON.stringify(body));});
 try{
  await f.save();assert.equal(await findRunningStudio(f.file,'editor',f.port),null);status=200;
  for(const value of ['Not JSON',{}, {...identity,owner:'another-owner'},{...identity,repository:'FennXWeb/Nuvori'},{...identity,branch:'main'},{...identity,document:{}},{...identity,revision:'not-a-revision'}]){
   body=value;assert.equal(await findRunningStudio(f.file,'editor',f.port),null);
  }
 }finally{await f.cleanup();}
});

test('session probes reject redirects without forwarding the private key',async()=>{
 let requests=0;
 const f=await fixture((_req,res)=>{requests++;res.writeHead(302,{Location:'/redirected'});res.end();});
 try{await f.save();assert.equal(await findRunningStudio(f.file,'editor',f.port),null);assert.equal(requests,1);}
 finally{await f.cleanup();}
});

test('a hung service has a bounded probe and simultaneous launch can wait for session publication',async()=>{
 let ready=false;const f=await fixture((_req,res)=>{if(ready)res.end(JSON.stringify(identity));});
 try{
  await f.save();const began=Date.now();assert.equal(await findRunningStudio(f.file,'beta',f.port),null);assert.ok(Date.now()-began<5000);
  await writeFile(f.file,'{}');ready=true;
  const launched=waitForRunningStudio(f.file,'editor',f.port);
  await delay(350);await f.save();assert.equal(await launched,`${f.origin}/editor.html#${key}`);
 }finally{await f.cleanup();}
});

test('port conflicts give actionable errors and browser opening only accepts fixed private studio links',async()=>{
 const betaError=Object.assign(new Error('listen EADDRINUSE'),{code:'EADDRINUSE',port:5188});
 assert.ok(isPortConflict(betaError));assert.match(studioLaunchError(betaError),/port 5188 is already in use/);
 assert.match(studioLaunchError(new Error('Port 5187 is already in use')),/port 5187 is already in use/);
 assert.equal(isPortConflict(new Error('Other failure')),false);
 assert.doesNotMatch(studioLaunchError(new Error('Command failed with secret data')),/secret data/);
 for(const url of ['https://example.com',`http://127.0.0.1:5187/evil.html#${key}`,`http://127.0.0.1:5188/editor.html#${key}`,`http://127.0.0.1:5187/editor.html?x=1#${key}`])await assert.rejects(openStudioPage(url),/Invalid private studio link/);
});
