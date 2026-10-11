import {createServer,type ViteDevServer} from 'vite';
import type {Server} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,readdir,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {authorizedRequest,verifyPrivateWorkspace,REPOSITORY,BRANCH,OWNER} from './editor-security';
import {publishWorld} from './world-publisher';
import {createProductionPublisher} from './production-publisher';
import {compileBeta,readBetaBuild} from './beta-build';
import {startBetaServer} from './beta-server';
import {findRunningStudio,waitForRunningStudio,isPortConflict,studioLaunchError,openStudioPage} from './studio-launch';
import {inspectWorld,validateWorld} from '../src/editor/model';
import {STUDIO_API_VERSION} from '../src/editor/studioProtocol';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),port=5187;
const home=path.join(root,'.world-editor'),drafts=path.join(home,'drafts'),content=path.join(root,'src/content/world.json');
const exec=promisify(execFile);
const run=async(command:string,args:string[],environment?:Record<string,string>)=>{
 const result=await exec(command,args,{cwd:root,windowsHide:true,maxBuffer:8*1024*1024,timeout:180000,env:{...process.env,...environment}});return result.stdout;
};
const sessionFile=path.join(home,'session.json'),page=process.argv.includes('--beta')?'beta':'editor';
async function announce(url:string,reused=false){
 console.log(`\nNUVORI WORLD STUDIO • Owner: ${OWNER}\nPrivate destination: ${REPOSITORY} / ${BRANCH}\n${reused?'World Studio is already running. Reusing your existing session.\nKeep the original server terminal running.\n':''}Open this private launch link (do not share):\n${url}\n`);
 if(process.argv.includes('--open'))await openStudioPage(url).catch(()=>console.log('The browser could not be opened automatically. Open the private link above.'));
}
async function main(){
 await verifyPrivateWorkspace(run);
 const running=await findRunningStudio(sessionFile,page,port);
 if(running){await announce(running,true);return;}
 try{await startStudio();}
 catch(error){
  if(isPortConflict(error)){
   const running=await waitForRunningStudio(sessionFile,page,port);
   if(running){await announce(running,true);return;}
  }
  throw error;
 }
}
async function startStudio(){
await mkdir(drafts,{recursive:true});
const key=randomBytes(32).toString('hex');
let betaServer:Server|undefined,server:ViteDevServer|undefined;
const closeServers=async()=>{
 try{await server?.close();}
 finally{if(betaServer?.listening)await new Promise<void>(resolve=>betaServer!.close(()=>resolve()));}
};
try{
betaServer=await startBetaServer(path.join(home,'beta'),key);
const betaStatus=async()=>{const build=await readBetaBuild(root),head=(await run('git',['rev-parse','HEAD'])).trim();return {build,head,stale:!!build&&build.sha!==head,busy,phase,launch:build?`http://127.0.0.1:5188/launch#${key}:${build.id}`:null};};
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const state=async()=>{const raw=await readFile(content,'utf8');return {document:JSON.parse(raw),revision:hash(raw)};};
const atomic=async(file:string,value:unknown)=>{const tmp=file+'.tmp';await writeFile(tmp,JSON.stringify(value,null,2)+'\n',{mode:0o600});await rename(tmp,file);};
let busy=false,phase='Ready';
const production=createProductionPublisher({run,phase:value=>{phase=value;},check:async sha=>{
 phase='Running regression checks';
 await exec(process.execPath,['--import','tsx','--test',...((await readdir(path.join(root,'tests'))).filter(f=>f.endsWith('.test.ts')).map(f=>'tests/'+f))],{cwd:root,windowsHide:true,timeout:180000,maxBuffer:8*1024*1024,env:{...process.env,NUVORI_TEST_BASE_WORLD:'1'}});
 phase='Building the production game';
 await exec(process.execPath,['--import','tsx','scripts/export-catalog.ts'],{cwd:root,windowsHide:true,timeout:180000});
 await exec(process.execPath,['scripts/third-party-licenses.mjs'],{cwd:root,windowsHide:true,timeout:180000});
 await exec(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'-b'],{cwd:root,windowsHide:true,timeout:180000});
 await exec(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build','--outDir',path.join(home,'production-check')],{cwd:root,windowsHide:true,timeout:180000,maxBuffer:8*1024*1024,env:{...process.env,GITHUB_SHA:sha}});
}});
server=await createServer({root,server:{host:'127.0.0.1',port,strictPort:true,open:false,cors:false,fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/.world-editor/**']},watch:{ignored:['**/.world-editor/**','**/src/content/world.json']}},plugins:[{
 name:'nuvori-private-studio',configureServer(vite){
  vite.middlewares.use('/__studio',async(req,res)=>{
   res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
   const send=(status:number,data:unknown)=>{res.statusCode=status;res.end(JSON.stringify(data));};
   if(!authorizedRequest(req.headers,req.socket.remoteAddress,key,port))return send(403,{error:'Open the private launch link from npm run world:editor on your computer.'});
   const url=new URL(req.url??'/',`http://127.0.0.1:${port}`),route=url.pathname;
   if(req.method==='GET'){
    try{
     if(route==='/session')return send(200,{apiVersion:STUDIO_API_VERSION,owner:OWNER,repository:REPOSITORY,branch:BRANCH,...await state(),phase,busy});
     if(route==='/beta')return send(200,await betaStatus());
     if(route==='/drafts'){
      const files=(await readdir(drafts)).filter(f=>/^(autosave|[a-f0-9-]{36})\.json$/.test(f));
      const list=await Promise.all(files.map(async f=>{const d=JSON.parse(await readFile(path.join(drafts,f),'utf8'));return {id:f.slice(0,-5),name:d.name,updated:d.updated};}));
      return send(200,list.sort((a,b)=>b.updated.localeCompare(a.updated)));
     }
     if(/^\/drafts\/(autosave|[a-f0-9-]{36})$/.test(route))return send(200,JSON.parse(await readFile(path.join(drafts,route.split('/')[2]+'.json'),'utf8')));
     return send(404,{error:'Unknown studio action.'});
    }catch{return send(500,{error:'The studio could not read its local data.'});}
   }
   if(req.method!=='POST'||req.headers.origin!==`http://127.0.0.1:${port}`||!req.headers['content-type']?.startsWith('application/json'))return send(403,{error:'Use the private studio to make changes.'});
   if(!['/production/review','/production/publish','/beta/build','/drafts','/publish'].includes(route))return send(404,{error:'Unknown studio action. Update and restart World Studio, then try again.'});
   if(busy)return send(409,{error:`${phase}. Please wait.`});
   busy=true;
   try{
    let raw='';for await(const chunk of req){raw+=chunk.toString();if(Buffer.byteLength(raw)>4*1024*1024)throw new Error('The world document exceeds the 4 MB limit.');}
    const body=JSON.parse(raw);
    if(route==='/production/review')return send(200,await production.preview());
    if(route==='/production/publish')return send(200,await production.publish(body));
    if(route==='/beta/build'){
     await compileBeta({root,run,phase:value=>{phase=value;},compile:async(out,id)=>{
      await exec(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'-b'],{cwd:root,windowsHide:true,timeout:180000,maxBuffer:8*1024*1024});
      await exec(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build','--mode','beta','--outDir',out],{cwd:root,windowsHide:true,timeout:180000,maxBuffer:8*1024*1024,env:{...process.env,GITHUB_SHA:id}});
     }});
     return send(200,{...await betaStatus(),busy:false,phase:'Ready'});
    }
    const issues=inspectWorld(body.document);if(issues.some(i=>i.severity==='error'))return send(422,{error:'Invalid world data.',issues});
    if(route==='/drafts'){
     const id=body.autosave?'autosave':randomUUID(),name=String(body.name??'Untitled draft').slice(0,80);
     await atomic(path.join(drafts,id+'.json'),{name,updated:new Date().toISOString(),document:body.document});
     return send(200,{id});
    }
    phase='Validating paths and habitats';const checks=validateWorld(body.document);
    if(checks.some(i=>i.severity==='error'))return send(422,{error:'Resolve validation errors before publishing.',issues:checks});
    const result=await publishWorld(body,{root,run,phase:value=>{phase=value;},check:async()=>{
     phase='Running regression checks';
     await exec(process.execPath,['--import','tsx','--test',...((await readdir(path.join(root,'tests'))).filter(f=>f.endsWith('.test.ts')).map(f=>'tests/'+f))],{cwd:root,windowsHide:true,timeout:180000,maxBuffer:8*1024*1024,env:{...process.env,NUVORI_TEST_BASE_WORLD:'1'}});
     phase='Building the beta game';
     await exec(process.execPath,['scripts/third-party-licenses.mjs'],{cwd:root,windowsHide:true,timeout:180000});
     await exec(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'-b'],{cwd:root,windowsHide:true,timeout:180000});
     await exec(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build','--mode','beta'],{cwd:root,windowsHide:true,timeout:180000,maxBuffer:8*1024*1024});
    }});return send(200,result);
   }catch(error){console.error('World studio action failed during '+phase+':',error instanceof Error?error.message:error);const message=error instanceof Error?error.message:'Studio action failed.';return send(400,{error:message.startsWith('Command failed')?'A validation, build, or Git check failed. Your draft is preserved; inspect the local terminal before retrying.':message});}
   finally{busy=false;phase='Ready';}
  });
 }
}]});
await server.listen();
const url=`http://127.0.0.1:${port}/${page}.html#${key}`;
await atomic(sessionFile,{url,betaUrl:`http://127.0.0.1:${port}/beta.html#${key}`});
let closing=false;
const close=async()=>{
 if(closing)return;closing=true;
 const saved=await readFile(sessionFile,'utf8').then(raw=>JSON.parse(raw)).catch(()=>null);
 if(saved?.url===url)await unlink(sessionFile).catch(()=>{});
 await closeServers();process.exit();
};
process.on('SIGINT',()=>void close());process.on('SIGTERM',()=>void close());
await announce(url);
}catch(error){await closeServers();throw error;}
}
await main().catch(error=>{console.error('\n'+studioLaunchError(error)+'\n');process.exitCode=1;});
