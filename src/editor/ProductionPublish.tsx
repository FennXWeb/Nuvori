import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Check,ExternalLink,GitBranch,Globe,LoaderCircle,RefreshCw,ShieldCheck,Upload} from 'lucide-react';
import type {ProductionReview,ProductionResult} from './productionTypes';
type Api=(path:string,body?:unknown)=>Promise<any>;
interface Props {api:Api;onBusy:(busy:boolean)=>void;hasDraftChanges:boolean}

export function ProductionPublish({api,onBusy,hasDraftChanges}:Props){
 const [review,setReview]=useState<ProductionReview|null>(null),[result,setResult]=useState<ProductionResult|null>(null),[busy,setBusy]=useState(false),[phase,setPhase]=useState(''),[error,setError]=useState(''),[confirmed,setConfirmed]=useState(false);
 const active=useRef(true),request=useRef(false);
 const task=async(work:()=>Promise<void>,label:string)=>{
  if(request.current)return;request.current=true;setBusy(true);onBusy(true);setError('');setPhase(label);
  const poll=setInterval(()=>{void api('/session').then(s=>{if(active.current)setPhase(s.phase);}).catch(()=>{});},2500);
  try{await work();}catch(e){if(active.current)setError((e as Error).message);}finally{clearInterval(poll);request.current=false;if(active.current){setBusy(false);onBusy(false);setPhase('');}}
 };
 const refresh=()=>void task(async()=>{setConfirmed(false);setReview(null);const next:ProductionReview=await api('/production/review',{});if(active.current)setReview(next);},'Comparing beta with main…');
 useEffect(()=>{active.current=true;refresh();return()=>{active.current=false;};},[]);
 const publish=()=>void task(async()=>{
  const selected=review;if(!selected||!confirmed||!selected.validation.passed||!selected.commitCount)return;
  setConfirmed(false);setReview(null);
  const next:ProductionResult=await api('/production/publish',{reviewId:selected.id,betaSha:selected.betaSha,mainSha:selected.mainSha,confirmed:true});
  if(active.current)setResult(next);
 },'Preparing the production release…');
 return <ProductionPublishView review={review} result={result} busy={busy} phase={phase} error={error} confirmed={confirmed} hasDraftChanges={hasDraftChanges} onConfirm={setConfirmed} onReview={refresh} onPublish={publish}/>;
}
interface ViewProps {review:ProductionReview|null;result:ProductionResult|null;busy:boolean;phase:string;error:string;confirmed:boolean;hasDraftChanges:boolean;onConfirm:(value:boolean)=>void;onReview:()=>void;onPublish:()=>void}
export function ProductionPublishView({review,result,busy,phase,error,confirmed,hasDraftChanges,onConfirm,onReview,onPublish}:ViewProps){
 return <div className="studio-production">
  <div className="studio-publish-target production-target"><Globe size={26}/><div><b>Nuvori · live game</b><span>FennXWeb/Nuvori · main · public repository</span></div><GitBranch size={21}/></div>
  {result?<div className="production-success" role="status"><Check size={32}/><h3>Beta is on main.</h3><p>Published commit <code>{result.sha.slice(0,7)}</code>. GitHub will run its production checks and deploy the live game. Follow the deployment below to see when it is ready.</p><div className="production-links"><a href={result.actionsUrl} target="_blank" rel="noopener noreferrer">View deployment <ExternalLink size={14}/></a><a href={result.liveUrl} target="_blank" rel="noopener noreferrer">Open Nuvori <ArrowRight size={14}/></a><a href={result.commitUrl} target="_blank" rel="noopener noreferrer">Published commit <ExternalLink size={14}/></a></div></div>:<>
   <p>Publish the committed beta, including game code, artwork and world changes, to the public repository. A successful GitHub deployment updates the live web game.</p>
   {hasDraftChanges&&<p className="production-draft-note">Your current world draft differs from beta. To include it, close this window and use <b>Publish to beta</b> first. This release includes the committed beta only.</p>}
   {review&&<>
    <div className="production-revisions"><div><small>CURRENT MAIN</small><code>{review.mainSha.slice(0,7)}</code></div><ArrowRight size={20}/><div><small>BETA TO PUBLISH</small><code>{review.betaSha.slice(0,7)}</code></div></div>
    {review.commitCount===0?<div className="studio-check-summary"><Check size={23}/><div><b>Main already contains this beta.</b><p>Publish new changes to private beta before releasing again.</p></div></div>:<>
     <div className="production-change-heading"><h3>{review.commitCount} commit{review.commitCount===1?'':'s'} · {review.files.length} changed files</h3><a href={review.compareUrl} target="_blank" rel="noopener noreferrer">Review full diff <ExternalLink size={12}/></a></div>
     <ol className="production-commits">{review.commits.map(c=><li key={c.sha}><code>{c.sha.slice(0,7)}</code><span>{c.subject}</span></li>)}</ol>{review.commitCount>review.commits.length&&<p className="studio-muted">Showing the latest {review.commits.length} commits. The full diff includes every change.</p>}
     <details className="production-files"><summary>Changed files</summary><ul>{review.files.map(f=><li key={f.path}><b>{f.status}</b><span>{f.path}</span></li>)}</ul></details>
     <div className={`production-validation ${review.validation.passed?'passed':''}`}><ShieldCheck size={22}/><div><b>{review.validation.status}</b><p>Tests and a production build also run before the push.</p></div><a href={review.validation.url} target="_blank" rel="noopener noreferrer">GitHub <ExternalLink size={12}/></a></div>
     <label className="production-confirm"><input type="checkbox" checked={confirmed} disabled={busy||!review.validation.passed} onChange={e=>onConfirm(e.target.checked)}/><span>I want to publish beta <b>{review.betaSha.slice(0,7)}</b> to public main and update the live game.</span></label>
     <button className="studio-primary studio-publish-button" disabled={busy||!confirmed||!review.validation.passed} onClick={onPublish}><Upload size={17}/> Publish beta to main</button>
     <p className="studio-muted">This review expires at {new Date(review.expiresAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}. Any newer beta or main changes require a new review.</p>
    </>}
   </>}
   {busy&&<p className="production-progress" role="status"><LoaderCircle className="studio-spin" size={20}/>{phase} Keep World Studio running.</p>}
   {error&&<p className="studio-inline-error production-error" role="alert">{error}</p>}
   {!busy&&<button className="production-refresh" onClick={onReview}><RefreshCw size={15}/>{review?'Refresh review':'Review current beta'}</button>}
  </>}
 </div>;
}
