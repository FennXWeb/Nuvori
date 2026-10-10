import {readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {OWNER,REPOSITORY,BRANCH} from './editor-security';

export type StudioPage='editor'|'beta';

/** Only reuse this checkout's saved capability, at the fixed loopback origin. */
export async function findRunningStudio(sessionFile:string,page:StudioPage,port=5187):Promise<string|null>{
 try{
  const saved=JSON.parse(await readFile(sessionFile,'utf8'));
  const url=new URL(saved.url),origin=`http://127.0.0.1:${port}`;
  if(url.origin!==origin||url.username||url.password||url.search||!/^\/(editor|beta)\.html$/.test(url.pathname)||!/^#[a-f0-9]{64}$/.test(url.hash))return null;
  // Never follow a redirect carrying the private launch key to another origin.
  const response=await fetch(`${origin}/__studio/session`,{headers:{'x-nuvori-editor-key':url.hash.slice(1)},redirect:'error',signal:AbortSignal.timeout(1000)});
  if(!response.ok)return null;
  const session=await response.json();
  if(session.owner!==OWNER||session.repository!==REPOSITORY||session.branch!==BRANCH||session.document?.schema!==1||!/^[a-f0-9]{64}$/.test(session.revision))return null;
  return `${origin}/${page}.html${url.hash}`;
 }catch{return null;}
}

/** A simultaneous first launch can bind its port before writing session.json. */
export async function waitForRunningStudio(sessionFile:string,page:StudioPage,port=5187):Promise<string|null>{
 for(let attempt=0;attempt<8;attempt++){
  await delay(200);
  const url=await findRunningStudio(sessionFile,page,port);if(url)return url;
 }
 return null;
}

export function isPortConflict(error:unknown){
 return (error as NodeJS.ErrnoException)?.code==='EADDRINUSE'||(error instanceof Error&&/Port \d+ is already in use/i.test(error.message));
}

export function studioLaunchError(error:unknown){
 if(isPortConflict(error)){
  const port=(error as NodeJS.ErrnoException&{port?:number}).port??(error instanceof Error?error.message.match(/Port (\d+)/i)?.[1]:undefined);
  return `Nuvori could not start: ${port?`port ${port} is`:'a required port is'} already in use, but no matching World Studio session could be verified. If an older Nuvori terminal is still open, close it and try again. Otherwise, close the app using that port. Your drafts and beta saves are preserved.`;
 }
 return error instanceof Error&&!error.message.startsWith('Command failed')?error.message:'Nuvori could not verify or start its private workspace. Check your GitHub CLI sign-in and try again.';
}

/** Desktop launchers open the requested page even when the server already exists. */
export async function openStudioPage(url:string){
 const parsed=new URL(url);
 if(parsed.origin!=='http://127.0.0.1:5187'||!/^\/(editor|beta)\.html$/.test(parsed.pathname)||!/^#[a-f0-9]{64}$/.test(parsed.hash)||parsed.username||parsed.password||parsed.search)throw new Error('Invalid private studio link.');
 const [command,args]:[string,string[]]=process.platform==='win32'?['rundll32.exe',['url.dll,FileProtocolHandler',url]]:process.platform==='darwin'?['open',[url]]:['xdg-open',[url]];
 await promisify(execFile)(command,args,{windowsHide:true,timeout:10000});
}
