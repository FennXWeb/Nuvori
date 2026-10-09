import {createServer} from 'vite';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,readdir,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {authorizedRequest,verifyPrivateWorkspace,REPOSITORY,BRANCH,OWNER} from './editor-security';
import {publishWorld} from './world-publisher';
import {inspectWorld,validateWorld} from '../src/editor/model';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),port=5187;
const home=path.join(root,'.world-editor'),drafts=path.join(home,'drafts'),content=path.join(root,'src/content/world.json');
const exec=promisify(execFile);
const run=async(command:string,args:string[])=>{
 const result=await exec(command,args,{cwd:root,windowsHide:true,maxBuffer:8*1024*1024,timeout:180000});return result.stdout;
};
await verifyPrivateWorkspace(run);
await mkdir(drafts,{recursive:true});
const key=randomBytes(32).toString('hex');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const state=async()=>{const raw=await readFile(content,'utf8');return {document:JSON.parse(raw),revision:hash(raw)};};
const atomic=async(file:string,value:unknown)=>{const tmp=file+'.tmp';await writeFile(tmp,JSON.stringify(value,null,2)+'\n',{mode:0o600});await rename(tmp,file);};
let busy=false,phase='Ready';
const server=await createServer({root,server:{host:'127.0.0.1',port,strictPort:true,open:false,cors:false,fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/.world-editor/**']},watch:{ignored:['**/.world-editor/**','**/src/content/world.json']}},plugins:[{
 name:'nuvori-private-studio',configureServer(vite){
  vite.middlewares.use('/__studio',async(req,res)=>{
   res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
   const send=(status:number,data:unknown)=>{res.statusCode=status;res.end(JSON.stringify(data));};
   if(!authorizedRequest(req.headers,req.socket.remoteAddress,key,port))return send(403,{error:'Open the private launch link from npm run world:editor on your computer.'});
   const url=new URL(req.url??'/',`http://127.0.0.1:${port}`),route=url.pathname;
   if(req.method==='GET'){
    try{
     if(route==='/session')return send(200,{owner:OWNER,repository:REPOSITORY,branch:BRANCH,...await state(),phase,busy});
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
   if(busy)return send(409,{error:`${phase}. Please wait.`});
   busy=true;
   try{
    let raw='';for await(const chunk of req){raw+=chunk.toString();if(Buffer.byteLength(raw)>4*1024*1024)throw new Error('The world document exceeds the 4 MB limit.');}
    const body=JSON.parse(raw);
    const issues=inspectWorld(body.document);if(issues.some(i=>i.severity==='error'))return send(422,{error:'Invalid world data.',issues});
    if(route==='/drafts'){
     const id=body.autosave?'autosave':randomUUID(),name=String(body.name??'Untitled draft').slice(0,80);
     await atomic(path.join(drafts,id+'.json'),{name,updated:new Date().toISOString(),document:body.document});
     return send(200,{id});
    }
    if(route!=='/publish')return send(404,{error:'Unknown studio action.'});
    phase='Validating paths and habitats';const checks=validateWorld(body.document);
    if(checks.some(i=>i.severity==='error'))return send(422,{error:'Resolve validation errors before publishing.',issues:checks});
    const result=await publishWorld(body,{root,run,phase:value=>{phase=value;},check:async()=>{
     phase='Running regression checks';
     await exec(process.execPath,['--import','tsx','--test',...((await readdir(path.join(root,'tests'))).filter(f=>f.endsWith('.test.ts')).map(f=>'tests/'+f))],{cwd:root,windowsHide:true,timeout:180000,maxBuffer:8*1024*1024,env:{...process.env,NUVORI_TEST_BASE_WORLD:'1'}});
     phase='Building the beta game';
     await exec(process.execPath,['scripts/third-party-licenses.mjs'],{cwd:root,windowsHide:true,timeout:180000});
     await exec(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'-b'],{cwd:root,windowsHide:true,timeout:180000});
     await exec(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build'],{cwd:root,windowsHide:true,timeout:180000,maxBuffer:8*1024*1024});
    }});return send(200,result);
   }catch(error){console.error('World studio action failed during '+phase+':',error instanceof Error?error.message:error);const message=error instanceof Error?error.message:'Studio action failed.';return send(400,{error:message.startsWith('Command failed')?'A validation, build, or Git check failed. Your draft is preserved; inspect the local terminal before retrying.':message});}
   finally{busy=false;phase='Ready';}
  });
 }
}]});
await server.listen();
const url=`http://127.0.0.1:${port}/editor.html#${key}`;
await atomic(path.join(home,'session.json'),{url});
console.log(`\nNUVORI WORLD STUDIO • Owner: ${OWNER}\nPrivate destination: ${REPOSITORY} / ${BRANCH}\nOpen this private launch link (do not share):\n${url}\n`);
const close=async()=>{await unlink(path.join(home,'session.json')).catch(()=>{});await server.close();process.exit();};
process.on('SIGINT',()=>void close());process.on('SIGTERM',()=>void close());
