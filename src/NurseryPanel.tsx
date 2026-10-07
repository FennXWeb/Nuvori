import { useEffect, useState } from "react";
import { Heart, Sprout, Clock3 } from "lucide-react";
import { Modal, NuvoArt } from "./components";
import { SPECIES_BY_ID } from "./data";
import type { Save } from "./game";
import { breedingDetails, durationLabel, pairingError, sexLabel, sexOf } from "./nursery";
import "./nursery.css";

export type NurseryAction = {type:"start";parents:[string,string]} | {type:"collect"|"cancel";jobId:string};
export function Nursery({save,account,onAction,onClose}:{save:Save;account:boolean;onAction:(action:NurseryAction)=>Promise<void>;onClose:()=>void}) {
  const [first,setFirst]=useState(""),[second,setSecond]=useState(""),[now,setNow]=useState(Date.now()),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const all=[...save.party,...save.box], a=all.find(n=>n.uid===first), b=all.find(n=>n.uid===second);
  const pairError=pairingError(a,b), details=a&&b&&!pairError?breedingDetails(a,b):null, job=save.nursery;
  const act=async(action:NurseryAction)=>{if(busy)return;setBusy(true);setError("");try{await onAction(action);}catch(e){setError(e instanceof Error?e.message:"The nursery could not be saved. Please try again.");}finally{setBusy(false);}};
  return <Modal title="A little new beginning" eyebrow="NUVO NURSERY · CLOVER’S CARE" wide onClose={onClose}>
    <div className="nursery-intro"><Sprout/><p>One male, one female, one family. Every branch can begin again. Clover looks after the parents while their level-1 base-form Nuvo grows ready to join you.</p></div>
    {error&&<p role="alert" className="nursery-error">{error}</p>}
    {job ? <section className="nursery-visit">
      <div className="nursery-pair">{job.parents.map(n=><div key={n.uid}><NuvoArt id={n.speciesId} prismatic={n.prismatic} size={125}/><strong>{SPECIES_BY_ID[n.speciesId].name}</strong><small>{sexLabel(n)} · Lv. {n.level} · Stage {SPECIES_BY_ID[n.speciesId].stage+1}</small></div>)}</div>
      <div className={`nursery-nest ${now>=job.readyAt?"ready":""}`}><span aria-hidden="true">✦</span><Heart size={40}/><span aria-hidden="true">✦</span></div>
      <h3>{now>=job.readyAt?"Your new companion is ready!":"Good things are growing."}</h3>
      <p>Level 1 {SPECIES_BY_ID[job.child.speciesId].name} · {now>=job.readyAt?sexLabel(job.child):"A new little possibility"}</p>
      <progress aria-label="Breeding progress" value={Math.min(1,Math.max(0,(now-job.startedAt)/(job.readyAt-job.startedAt)))} max={1}/>
      <p role="status"><Clock3 size={15}/> {now>=job.readyAt?"Ready to collect":`${durationLabel(job.readyAt-now)} remaining`}</p>
      <button className="primary-button" disabled={busy||now<job.readyAt} onClick={()=>act({type:"collect",jobId:job.id})}>Welcome your Nuvo & collect parents</button>
      <button className="text-button" disabled={busy} onClick={()=>act({type:"cancel",jobId:job.id})}>Bring parents home · end this visit without offspring</button>
    </section> : <>
      <div className="nursery-pair">{(["male","female"] as const).map((sex,i)=>{const n=i?b:a;return <label key={sex} className="nursery-parent"><strong>{sex==="male"?"♂ Male parent":"♀ Female parent"}</strong>{n?<NuvoArt id={n.speciesId} prismatic={n.prismatic} size={120}/>:<span className="nursery-empty"><Heart size={34}/></span>}<select aria-label={`${sex} parent`} value={i?second:first} onChange={e=>(i?setSecond:setFirst)(e.target.value)}><option value="">Choose a {sex} Nuvo…</option>{all.filter(n=>sexOf(n)===sex).map(n=><option key={n.uid} value={n.uid}>{SPECIES_BY_ID[n.speciesId].name} · Lv. {n.level} · Stage {SPECIES_BY_ID[n.speciesId].stage+1}{save.party.some(p=>p.uid===n.uid)?" · Crew":" · Reserve"}</option>)}</select>{n&&<small>{SPECIES_BY_ID[n.speciesId].rarity} · {SPECIES_BY_ID[SPECIES_BY_ID[n.speciesId].base].name} family</small>}</label>;})}</div>
      {details&&a?<div className="nursery-estimate"><strong><Clock3 size={17}/> {durationLabel(details.seconds*1000)}</strong><p>{details.rarity}: {details.rarityMinutes} min × {details.levelFactor.toFixed(2)} from parent levels × {details.stageFactor.toFixed(1)} from evolution stages.</p><p>Your new companion: <b>level 1 {SPECIES_BY_ID[SPECIES_BY_ID[a.speciesId].base].name}</b>. Its sex is a surprise, with the usual chance of being Prismatic.</p></div>:<p className="section-intro">{pairError}</p>}
      <button className="primary-button full-width" disabled={busy||!!pairError} onClick={()=>act({type:"start",parents:[first,second]})}><Heart size={17}/> Leave this pair with Clover</button>
    </>}
    <p className="nursery-note">Parents stay here until you collect or cancel. Keep a healthy companion with you. The timer continues while you explore or close the game.{account?" Online visits use the server clock and follow your account across devices.":" This visit is saved with your guest adventure on this device."}</p>
    <p className="nursery-note">Dreamweaver: one wild male and one wild female may be caught per adventure. Nursery offspring do not use or reset that lifetime catch allowance.</p>
  </Modal>;
}
