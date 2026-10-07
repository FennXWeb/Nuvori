import { gameAudio } from "./audio";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, GripVertical, RefreshCw, Scissors, Shirt, Shield } from "lucide-react";
import { Health, Modal, NuvoArt, PlayerArt } from "./components";
import { SPECIES_BY_ID } from "./data";
import { sexOf } from "./nursery";
import { OUTFITS, HAIRSTYLES, HAIR_COLORS, ORBS, orbCount, reorderCrew } from "./expansion";
import type { Save } from "./game";

export function CrewStrip({save,disabled,onChange,onManage}:{save:Save;disabled:boolean;onChange:(s:Save)=>void;onManage:()=>void}) {
  const drag=useRef<number|null>(null), moved=useRef(false); const [over,setOver]=useState<number|null>(null);
  return <section className="team-strip"><div className="team-strip-title"><span className="eyebrow">BY YOUR SIDE · DRAG TO REORDER</span><h3>Your little crew</h3><button onClick={onManage}>Manage team <ArrowRight size={14}/></button></div>
    <div className="team-slots" aria-label="Crew order. The far-left Nuvo leads. Use Alt and arrow keys to reorder.">
      {Array.from({length:6},(_,i)=>{const n=save.party[i];return <button key={n?.uid || i} draggable={Boolean(n)&&!disabled} disabled={disabled}
        className={`team-slot ${i===0&&n?"lead-slot":""} ${!n?"empty-slot":""} ${over===i?"drag-over":""}`}
        aria-label={n?`${SPECIES_BY_ID[n.speciesId].name}, position ${i+1}${i===0?", active leader":""}. Alt left or right to reorder.`:"Empty team slot"}
        onDragStart={e=>{if(!n)return;drag.current=i;moved.current=true;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",String(i));}}
        onDragOver={e=>{if(drag.current!==null&&n){e.preventDefault();e.dataTransfer.dropEffect="move";setOver(i);}}}
        onDrop={e=>{e.preventDefault();if(drag.current!==null&&n)onChange(reorderCrew(save,drag.current,i));drag.current=null;setOver(null);}}
        onDragEnd={()=>{drag.current=null;setOver(null);setTimeout(()=>{moved.current=false;},0);}}
        onKeyDown={e=>{if(e.altKey&&n&&["ArrowLeft","ArrowRight"].includes(e.key)){e.preventDefault();onChange(reorderCrew(save,i,i+(e.key==="ArrowLeft"?-1:1)));}}}
        onClick={()=>{if(!moved.current)onManage();}}>
        {n?<><GripVertical className="crew-grip" size={13}/><NuvoArt id={n.speciesId} size={65} prismatic={n.prismatic}/><span>{SPECIES_BY_ID[n.speciesId].name}</span><small>{sexOf(n)==="male"?"♂":"♀"} Lv. {n.level}{i===0?" · Active":""}</small><Health nuvo={n} showText={false}/></>:<><span>＋</span><small>A new friend</small></>}
      </button>;})}
    </div><p className="crew-hint">Far left leads and follows you · Other crew earn 20% XP · Alt + ← / → also reorders</p></section>;
}

export function StyleShop({save,kind,onChange,onClose,notify}:{save:Save;kind:"tailor"|"barber";onChange:(s:Save)=>void;onClose:()=>void;notify:(s:string)=>void}) {
  const [outfit,setOutfit]=useState(save.player.outfit||0),[hair,setHair]=useState(save.player.hair||0),[hairColor,setColor]=useState(save.player.hairColor||0);
  const owned=(save.wardrobe||[0]).includes(outfit)||outfit===0;
  const changed=kind==="tailor"?outfit!==(save.player.outfit||0):hair!==(save.player.hair||0)||hairColor!==save.player.hairColor;
  const cost=kind==="tailor"?owned?0:OUTFITS[outfit].price:40;
  return <Modal title={kind==="tailor"?"Thread & Thistle":"The Tidy Tangle"} eyebrow={kind==="tailor"?"A NEW LOOK FOR THE NEXT CHAPTER":"A LITTLE CHANGE. A WHOLE NEW YOU."} onClose={onClose}>
    <div className="style-preview"><div className="style-halo"/><PlayerArt palette={save.player.palette} size={210} look={{outfit:kind==="tailor"?outfit:save.player.outfit,hair:kind==="barber"?hair:save.player.hair,hairColor:kind==="barber"?hairColor:save.player.hairColor}}/><div><span className="eyebrow">{save.player.name}</span><h3>{kind==="tailor"?OUTFITS[outfit].name:HAIRSTYLES[hair]}</h3><p>{save.coins} keeper coins</p></div></div>
    <div className="style-options">{(kind==="tailor"?OUTFITS.map(o=>o.name):HAIRSTYLES).map((name,i)=><button key={name} className={(kind==="tailor"?outfit:hair)===i?"chosen":""} aria-pressed={(kind==="tailor"?outfit:hair)===i} onClick={()=>kind==="tailor"?setOutfit(i):setHair(i)}>{kind==="tailor"?<Shirt size={19}/>:<Scissors size={19}/>}<strong>{name}</strong>{kind==="tailor"&&<small>{i===0||save.wardrobe?.includes(i)?"Owned":`${OUTFITS[i].price} coins`}</small>}</button>)}</div>
    {kind==="barber"&&<div className="hair-swatches" aria-label="Hair color">{HAIR_COLORS.map((c,i)=><button key={c} aria-label={`Hair color ${i+1}`} aria-pressed={hairColor===i} onClick={()=>setColor(i)} style={{background:c}}>{hairColor===i?"✓":""}</button>)}</div>}
    <footer className="expansion-footer"><p>{kind==="tailor"?"Owned clothing is free to wear again.":"A cut and color costs 40 keeper coins."}</p><button className="primary-button" disabled={!changed||save.coins<cost} onClick={()=>{onChange({...save,coins:save.coins-cost,wardrobe:kind==="tailor"?[...new Set([0,...(save.wardrobe||[]),outfit])]:save.wardrobe,player:{...save.player,...(kind==="tailor"?{outfit}:{hair,hairColor})}});gameAudio.play("customize");notify("Your new look is ready for the world.");}}>{!changed?"Currently wearing":cost?`Apply · ${cost} coins`:"Wear this outfit"}</button></footer>
  </Modal>;
}

export function SpecialtyOrbs({save,shop,onChange}:{save:Save;shop:boolean;onChange:(s:Save)=>void}) {
 return <>{ORBS.slice(1).map(orb=><div className="item-row" key={orb.id}><span className="item-icon" style={{background:orb.color}}>◈</span><div><h3>{orb.name}<small>×{orbCount(save,orb.id)}</small></h3><p>{orb.description}</p></div>{shop?<button className="secondary-button" disabled={save.coins<orb.cost} onClick={()=>{onChange({...save,coins:save.coins-orb.cost,specialOrbs:{...save.specialOrbs,[orb.id]:orbCount(save,orb.id)+1}});gameAudio.play("purchase");}}>Buy · {orb.cost}</button>:<span className="muted">Use in battle</span>}</div>)}</>;
}

declare const __BUILD_ID__: string;
export function UpdateNotice({safe,onApply,onBlocking}:{safe:boolean;onApply:()=>Promise<void>;onBlocking:(v:boolean)=>void}) {
  const [update,setUpdate]=useState(""),[deferred,setDeferred]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const shown=Boolean(update)&&safe&&deferred!==update;
  useEffect(()=>{onBlocking(shown);return()=>onBlocking(false);},[shown,onBlocking]);
  useEffect(()=>{const abort=new AbortController();let alive=true;let checking=false;
    if(window.nuvoriDesktop)return; // SMOG installs whole desktop releases; a page refresh cannot update the EXE.
    const check=async()=>{if(checking)return;checking=true;try { const res=await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`,{cache:"no-store",signal:abort.signal});if(!res.ok)return;const data=await res.json();if(alive&&typeof data.id==="string"&&data.id!==__BUILD_ID__)setUpdate(data.id); }catch{/* Offline players keep exploring. */}finally{checking=false;}};
    const visible=()=>{if(document.visibilityState==="visible")void check();};void check();const timer=setInterval(visible,60000);document.addEventListener("visibilitychange",visible);
    return()=>{alive=false;abort.abort();clearInterval(timer);document.removeEventListener("visibilitychange",visible);};
  },[]);
  if(!update)return null;
  if(!safe||deferred===update)return <button className="update-pill" onClick={()=>setDeferred("")} disabled={!safe}><RefreshCw size={15}/> Update ready{!safe?" · after this activity":""}</button>;
  return <Modal title="A new chapter is ready" eyebrow="NUVORI HAS BEEN UPDATED" onClose={()=>{if(!busy)setDeferred(update);}}><div className="update-illustration"><RefreshCw size={42}/><span>✦</span></div><p className="update-copy">An update is available. Refresh the page, or apply it below to save your adventure and load the latest Nuvori.</p>{error&&<p role="alert">{error}</p>}<div className="expansion-footer"><button className="secondary-button" disabled={busy} onClick={()=>setDeferred(update)}>Keep exploring</button><button className="primary-button" disabled={busy} onClick={async()=>{setBusy(true);setError("");try{await onApply();window.location.reload();}catch(e){setError((e as Error).message);setBusy(false);}}}>{busy?"Saving your adventure…":"Save & apply update"}<RefreshCw size={16}/></button></div></Modal>;
}
