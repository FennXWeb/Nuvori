import {useEffect,useState} from "react";
import {NuvoArt,TypeBadge} from "./components";
import {SPECIES_BY_ID,type Nuvo} from "./data";
import {gameAudio} from "./audio";
export function EvolutionSequence({before,after,onDone}:{before:Nuvo;after:Nuvo;onDone:()=>void}){
 const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 const [phase,setPhase]=useState(reduced?3:0),s=SPECIES_BY_ID[after.speciesId];
 useEffect(()=>{
  const stop=gameAudio.evolution();
  const timers=[setTimeout(()=>setPhase(p=>Math.max(p,1)),1100),setTimeout(()=>setPhase(p=>Math.max(p,2)),3100),setTimeout(()=>{setPhase(3);gameAudio.cry(after.speciesId,0,.5);},4800)];
  if(reduced)timers.forEach(clearTimeout);
  return()=>{timers.forEach(clearTimeout);stop();};
 },[after.speciesId,reduced]);
 return <div className={`evolution-cinema phase-${phase} ${reduced?"reduced-cinema":""}`} role="dialog" aria-modal="true" aria-label="Nuvo evolution"><div className="evolution-nebula"/><div className="evolution-orbits"><i/><i/><i/></div><div className="evolution-motes">{Array.from({length:28},(_,i)=><i key={i} style={{"--i":i} as React.CSSProperties}/>)}</div><span className="eyebrow">A NEW POSSIBILITY AWAKENS</span><div className="evolution-stage"><div className="evolution-before"><NuvoArt id={before.speciesId} prismatic={before.prismatic} size={330}/></div><div className="evolution-after"><NuvoArt id={after.speciesId} prismatic={after.prismatic} size={390}/></div><div className="evolution-bloom"/></div><div className="evolution-caption" aria-live="polite">{phase<3?<><h2>{SPECIES_BY_ID[before.speciesId].name} is evolving…</h2><p>Every choice becomes part of your story.</p></>:<><span className="eyebrow">MEET YOUR NEW COMPANION</span><h2>{s.name}</h2><div>{s.types.map(t=><TypeBadge type={t} key={t}/>)}</div><p>{s.title} · Stage {s.stage+1}</p><button autoFocus className="primary-button" onClick={onDone}>Continue together →</button></>}</div>{phase<3&&<button className="cinema-skip" onClick={()=>setPhase(3)}>Skip animation</button>}</div>;
}
