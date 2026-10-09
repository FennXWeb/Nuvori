import {randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {verifyPrivateWorkspace,type Runner} from './editor-security';

export interface BetaBuild {id:string;sha:string;builtAt:string;version:string}
export const validBuildId=(id:string)=>/^[a-f0-9]{12}-[a-f0-9]{12}$/.test(id);
export async function readBetaBuild(root:string):Promise<BetaBuild|null>{
 try{
  const value=JSON.parse(await readFile(path.join(root,'.world-editor/beta/current.json'),'utf8')) as BetaBuild;
  if(!validBuildId(value.id)||!value.sha.startsWith(value.id.slice(0,12)))return null;
  await readFile(path.join(root,'.world-editor/beta/builds',value.id,'index.html'));
  return value;
 }catch{return null;}
}
export async function compileBeta(options:{root:string;run:Runner;compile:(out:string,id:string)=>Promise<void>;phase:(value:string)=>void}):Promise<BetaBuild>{
 const {root,run,compile,phase}=options;
 phase('Checking the private beta branch');
 await verifyPrivateWorkspace(run);
 if((await run('git',['status','--porcelain'])).trim())throw new Error('Commit your code changes to the beta branch first, then rebuild. Saved World Studio drafts can stay unpublished.');
 const sha=(await run('git',['rev-parse','HEAD'])).trim();
 if(!/^[a-f0-9]{40}$/.test(sha))throw new Error('Could not identify the beta commit.');
 const id=sha.slice(0,12)+'-'+randomBytes(6).toString('hex');
 const home=path.join(root,'.world-editor/beta'),out=path.join(home,'builds',id);
 await mkdir(out,{recursive:true});
 phase('Compiling your private adventure');
 await compile(out,id);
 // Never replace a good build with an incomplete build or a changing worktree.
 await readFile(path.join(out,'index.html'));
 const version=JSON.parse(await readFile(path.join(out,'version.json'),'utf8'));
 if(version.id!==id)throw new Error('The compiled build identity does not match. The previous beta is preserved.');
 if((await run('git',['rev-parse','HEAD'])).trim()!==sha||(await run('git',['status','--porcelain'])).trim())throw new Error('The checkout changed during compilation. Rebuild after committing; the previous beta is preserved.');
 const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
 const record:BetaBuild={id,sha,builtAt:new Date().toISOString(),version:pkg.version};
 await writeFile(path.join(out,'beta-build.json'),JSON.stringify(record));
 await writeFile(path.join(home,'current.json.tmp'),JSON.stringify(record));
 await rename(path.join(home,'current.json.tmp'),path.join(home,'current.json'));
 return record;
}
