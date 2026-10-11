import {randomUUID} from 'node:crypto';
import {verifyPrivateWorkspace,REPOSITORY,BRANCH,type Runner} from './editor-security';
import type {ProductionReview,ProductionConfirmation,ProductionResult} from '../src/editor/productionTypes';

export const PRODUCTION_REPOSITORY='FennXWeb/Nuvori';
const productionUrl=`https://github.com/${PRODUCTION_REPOSITORY}.git`,testingUrl=`https://github.com/${REPOSITORY}.git`;
const validSha=(value:string)=>/^[a-f0-9]{40}$/.test(value);
interface Dependencies {run:Runner;check:(sha:string)=>Promise<void>;phase:(value:string)=>void;now?:()=>number}

/** An owner-reviewed, one-use promotion. It never commits drafts or force-pushes history. */
export function createProductionPublisher({run,check,phase,now=Date.now}:Dependencies){
 let review:ProductionReview|null=null;
 const clean=async()=>{if((await run('git',['status','--porcelain'])).trim())throw new Error('Commit and push your development changes to private beta first. Publication requires a clean checkout. Local World Studio drafts can stay saved.');};
 const identities=async()=>{
  await verifyPrivateWorkspace(run);
  const destinations=(await run('git',['remote','get-url','--push','--all','origin'])).trim().split(/\r?\n/);
  if(destinations.length!==1||!/^https:\/\/github\.com\/FennXWeb\/Nuvori(?:\.git)?\/?$/i.test(destinations[0])&&!/^git@github\.com:FennXWeb\/Nuvori(?:\.git)?$/i.test(destinations[0]))throw new Error('The origin push destination must be only FennXWeb/Nuvori.');
  const repo=JSON.parse(await run('gh',['repo','view',`https://github.com/${PRODUCTION_REPOSITORY}`,'--json','visibility,nameWithOwner']));
  if(repo.visibility!=='PUBLIC'||repo.nameWithOwner!==PRODUCTION_REPOSITORY)throw new Error('The production repository identity could not be verified.');
 };
 const heads=async()=>{
  await identities();await clean();
  // Fetch explicit repository branches instead of relying on broad configured refspecs.
  await run('git',['fetch','--no-tags',testingUrl,`refs/heads/${BRANCH}:refs/remotes/testing/${BRANCH}`]);
  await run('git',['fetch','--no-tags',productionUrl,'refs/heads/main:refs/remotes/origin/main']);
  const betaSha=(await run('git',['rev-parse','HEAD'])).trim(),remoteBeta=(await run('git',['rev-parse',`refs/remotes/testing/${BRANCH}`])).trim(),mainSha=(await run('git',['rev-parse','refs/remotes/origin/main'])).trim();
  if(!validSha(betaSha)||!validSha(mainSha)||betaSha!==remoteBeta)throw new Error('Your checkout must match the pushed private beta. Push or pull codex/testing, then review again.');
  try{await run('git',['merge-base','--is-ancestor',mainSha,betaSha]);}catch{throw new Error('Main has changes that are not in beta. Merge main into private beta, resolve any conflicts and validate it before publishing.');}
  return {betaSha,mainSha};
 };
 const validation=async(sha:string)=>{
  const runs=JSON.parse(await run('gh',['run','list','--repo',REPOSITORY,'--workflow','testing.yml','--branch',BRANCH,'--commit',sha,'--limit','1','--json','databaseId,headSha,status,conclusion']));
  const result=runs[0],passed=result?.headSha===sha&&result.status==='completed'&&result.conclusion==='success';
  const id=String(result?.databaseId??'');
  return {passed,status:!result?'No beta validation found':result.status==='completed'?(passed?'Beta validation passed':`Beta validation ${result.conclusion}`):'Beta validation is still running',url:/^\d+$/.test(id)?`https://github.com/${REPOSITORY}/actions/runs/${id}`:`https://github.com/${REPOSITORY}/actions/workflows/testing.yml`};
 };
 const preview=async():Promise<ProductionReview>=>{
  review=null;phase('Comparing private beta with main');
  const {betaSha,mainSha}=await heads(),range=`${mainSha}..${betaSha}`;
  const count=(await run('git',['rev-list','--count',range])).trim();
  if(!/^\d+$/.test(count))throw new Error('Could not read the changes between beta and main.');
  const commits=(await run('git',['log','--max-count=50','--format=%H%x09%s',range])).trim().split(/\r?\n/).filter(Boolean).map(line=>{const at=line.indexOf('\t');return {sha:line.slice(0,at),subject:line.slice(at+1)};});
  const fields=(await run('git',['diff','--no-renames','--name-status','-z',mainSha,betaSha])).split('\0'),files:ProductionReview['files']=[];
  for(let i=0;i+1<fields.length;i+=2)files.push({status:fields[i],path:fields[i+1]});
  review={id:randomUUID(),betaSha,mainSha,expiresAt:new Date(now()+10*60*1000).toISOString(),commitCount:Number(count),commits,files,validation:await validation(betaSha),compareUrl:`https://github.com/${REPOSITORY}/compare/${mainSha}...${betaSha}`};
  return review;
 };
 const publish=async(body:ProductionConfirmation):Promise<ProductionResult>=>{
  const approved=review;
  if(!approved||!body||body.confirmed!==true||body.reviewId!==approved.id||body.betaSha!==approved.betaSha||body.mainSha!==approved.mainSha||now()>=Date.parse(approved.expiresAt))throw new Error('Review the current beta and confirm publication again. This review is missing, changed or expired.');
  review=null; // Consume before asynchronous checks, including failed attempts.
  if(!approved.commitCount)throw new Error('Main already contains this beta.');
  const unchanged=async()=>{const current=await heads();if(current.betaSha!==approved.betaSha||current.mainSha!==approved.mainSha)throw new Error('Beta or main changed after your review. Review the new changes before publishing.');};
  phase('Verifying the reviewed commits');await unchanged();
  const checks=await validation(approved.betaSha);if(!checks.passed)throw new Error(checks.status+'. Wait for a successful beta build, then review again.');
  phase('Validating the production build');await check(approved.betaSha);
  phase('Checking for changes during validation');await unchanged();
  phase('Publishing the reviewed beta to main');
  let pushFailed=false;
  try{
   // Keep the guard enabled. This process-only grant permits this exact commit and existing main head.
   await run('git',['-c','core.hooksPath=.githooks','push',productionUrl,`${approved.betaSha}:refs/heads/main`],{NUVORI_MAIN_PUBLISH:'owner-confirmed',NUVORI_MAIN_SHA:approved.betaSha,NUVORI_MAIN_BASE:approved.mainSha});
  }catch{pushFailed=true;}
  // A disconnected push can succeed remotely. Verify it rather than falsely reporting failure or retrying it.
  let remote='';try{remote=(await run('git',['ls-remote',productionUrl,'refs/heads/main'])).trim().split(/\s+/)[0];}catch{/* Surface uncertainty below. */}
  if(remote!==approved.betaSha)throw new Error(pushFailed?'GitHub did not confirm the publication. No automatic retry was made. Review the current main branch before trying again.':'The push was accepted, but its final main commit could not be confirmed. Check GitHub before retrying.');
  return {sha:approved.betaSha,commitUrl:`https://github.com/${PRODUCTION_REPOSITORY}/commit/${approved.betaSha}`,actionsUrl:`https://github.com/${PRODUCTION_REPOSITORY}/actions/workflows/deploy.yml`,liveUrl:'https://fennxweb.github.io/Nuvori/'};
 };
 return {preview,publish};
}
