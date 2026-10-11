import {timingSafeEqual} from 'node:crypto';
export const OWNER='FennXWeb',REPOSITORY='FennXWeb/Nuvori-Testing',BRANCH='codex/testing';
export function authorizedRequest(headers:Record<string,string|string[]|undefined>,remote:string|undefined,key:string,port:number){
 const expected=`127.0.0.1:${port}`,provided=headers['x-nuvori-editor-key'];
 if(!['127.0.0.1','::ffff:127.0.0.1'].includes(remote??'')||headers.host!==expected||typeof provided!=='string')return false;
 const a=Buffer.from(provided),b=Buffer.from(key);
 if(a.length!==b.length||!timingSafeEqual(a,b))return false;
 return !headers.origin||headers.origin===`http://${expected}`;
}
export type Runner=(command:string,args:string[],environment?:Record<string,string>)=>Promise<string>;
export async function verifyPrivateWorkspace(run:Runner){
 const branch=(await run('git',['branch','--show-current'])).trim();
 if(branch!==BRANCH)throw new Error('Switch to codex/testing before opening or publishing from the studio.');
 const remote=(await run('git',['remote','get-url','--push','testing'])).trim();
 if(!/^(https:\/\/github\.com\/|git@github\.com:)FennXWeb\/Nuvori-Testing(?:\.git)?$/i.test(remote))throw new Error('The testing remote must point to the private Nuvori-Testing repository.');
 if((await run('gh',['api','--hostname','github.com','user','--jq','.login'])).trim()!==OWNER)throw new Error('Only the FennXWeb GitHub account can open this studio. Sign into that account with GitHub CLI.');
 const repo=JSON.parse(await run('gh',['repo','view',`https://github.com/${REPOSITORY}`,'--json','visibility,nameWithOwner']));
 if(repo.visibility!=='PRIVATE'||repo.nameWithOwner.toLowerCase()!==REPOSITORY.toLowerCase())throw new Error('Publishing is locked: the testing repository must be private.');
}
