import path from 'node:path';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {verifyPrivateWorkspace,BRANCH,REPOSITORY,type Runner} from './editor-security';
import {validateWorld} from '../src/editor/model';
import type {WorldDocument} from '../src/worldContent';
export const worldHash=(value:string)=>createHash('sha256').update(value).digest('hex');
interface PublishRequest {document:WorldDocument;revision:string;name:string}
interface Dependencies {root:string;run:Runner;check:()=>Promise<void>;phase:(value:string)=>void}
/** World-draft publisher: fixed file, fixed private remote and ref, no force pushes or shell interpolation. */
export async function publishWorld(body:PublishRequest,{root,run,check,phase}:Dependencies){
 phase('Validating paths and habitats');const issues=validateWorld(body.document);
 if(issues.some(i=>i.severity==='error'))throw new Error('Resolve world validation errors before publishing.');
 await verifyPrivateWorkspace(run);
 if((await run('git',['status','--porcelain'])).trim())throw new Error('Save and commit other development changes first. The publisher only commits world data from a clean checkout.');
 const relative='src/content/world.json',file=path.join(root,relative),previous=await readFile(file,'utf8');
 if(worldHash(previous)!==body.revision)throw new Error('The beta world changed since this draft was opened. Export your draft, reload the studio, then import and review it.');
 const directory=path.join(root,'.world-editor/drafts');await mkdir(directory,{recursive:true});
 await writeFile(path.join(directory,randomUUID()+'.json'),JSON.stringify({name:'Before beta publish',updated:new Date().toISOString(),document:JSON.parse(previous)},null,2)+'\n',{mode:0o600});
 const changed=JSON.stringify(body.document)!==JSON.stringify(JSON.parse(previous));
 const written=JSON.stringify(body.document,null,2)+'\n';
 let committed=false;
 try{
  if(changed){
   await writeFile(file+'.tmp',written);await rename(file+'.tmp',file);
   await check();
   if(await readFile(file,'utf8')!==written)throw new Error('The world file changed during validation. That newer file is preserved; review it before publishing.');
   await verifyPrivateWorkspace(run);
   // Refuse unrelated modifications made while checks ran; never stage another author's work.
   const dirty=(await run('git',['status','--porcelain'])).trimEnd().split(/\r?\n/).filter(Boolean);
   if(dirty.some(line=>line.slice(3)!==relative))throw new Error('Other files changed while the beta was building. Commit those changes before publishing.');
   await run('git',['add','--',relative]);
   await run('git',['commit','-m',`Update beta world: ${String(body.name??'World studio').replace(/[\r\n]/g,' ').slice(0,80)}`,'--',relative]);committed=true;
  }
 }catch(error){
  if(!committed){if(await readFile(file,'utf8')===written)await writeFile(file,previous);await run('git',['reset','--',relative]).catch(()=>{});}
  throw error;
 }
 phase('Pushing to private beta');
 try{await run('git',['push','testing',`${BRANCH}:refs/heads/${BRANCH}`]);}catch{throw new Error('The beta commit is saved locally, but GitHub could not accept the push. Reload the studio and publish again to retry. Nothing was pushed to main.');}
 const sha=(await run('git',['rev-parse','HEAD'])).trim(),raw=await readFile(file,'utf8');
 return {document:JSON.parse(raw),revision:worldHash(raw),sha,url:`https://github.com/${REPOSITORY}/commit/${sha}`,issues};
}
