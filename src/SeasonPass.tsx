import {useEffect,useState} from "react";
import {Modal,NuvoArt} from "./components";
import type {Save} from "./game";
import {SEASON,PASS_REWARDS,passProgress,passTier,claimPassReward,activatePassBoost} from "./season";
import {ORBS} from "./expansion";
import {gameAudio} from "./audio";
export function SeasonPass({save,onChange,onClose}:{save:Save;onChange:(s:Save)=>void;onClose:()=>void}){
 const p=passProgress(save),tier=passTier(save),[page,setPage]=useState(Math.min(9,Math.floor(tier/10))),[error,setError]=useState(""),[now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const apply=(fn:()=>Save)=>{try{onChange(fn());setError("");gameAudio.play("purchase");}catch(e){setError((e as Error).message);}};
 const active=now>=SEASON.starts&&now<SEASON.ends;
 return <Modal title={`Season 1 · ${SEASON.name}`} eyebrow="THE FREE SEASON PASS · 100 TIERS" onClose={onClose} wide>
 <div className="pass-hero"><div><span className="eyebrow">{SEASON.subtitle}</span><h3>A season of little beginnings.<br/>A companion written in the stars.</h3><p>Play, explore, collect. Every reward is free. Earn the exclusive mythical <strong>Solunelle</strong> at tier 100.</p><small>October 9, 2026 – January 9, 2027 · UTC</small></div><NuvoArt id="solunelle" size={220}/></div>
 <div className="pass-progress"><strong>Tier {tier} / 100</strong><progress max={30000} value={p.xp} aria-label="Season pass experience"/><span>{p.xp.toLocaleString()} / 30,000 XP</span></div>
 <div className="pass-meta"><p>{active?`${tier===100?"All tiers unlocked":`${300-p.xp%300} XP to your next tier`}. Battles 75 XP · New species 125 · Discoveries 150 · First trainer win +150 · Champions rewards 300.`:"Season closed. Earned rewards remain claimable."}</p><button className="secondary-button" disabled={!active||!p.boosts||tier===100} onClick={()=>apply(()=>activatePassBoost(save))}>⚡ Use 2× boost ({p.boosts})</button>{p.boostUntil>now&&active&&<strong>2× pass XP · {Math.ceil((p.boostUntil-now)/60000)}m left</strong>}</div>
 {error&&<p role="alert">{error}</p>}
 <div className="pass-pages" aria-label="Reward pages">{Array.from({length:10},(_,i)=><button key={i} aria-pressed={page===i} onClick={()=>setPage(i)}>{i*10+1}–{i*10+10}</button>)}</div>
 <div className="pass-track">{PASS_REWARDS.slice(page*10,page*10+10).map(r=>{const claimed=p.claimed.includes(r.tier),unlocked=tier>=r.tier;return <article key={r.tier} className={`pass-reward ${unlocked?"unlocked":""} ${claimed?"claimed":""} ${r.kind==="nuvo"||r.kind==="cosmetic"?"rare-reward":""}`}><span className="eyebrow">TIER {r.tier}</span><span className="reward-icon">{r.icon}</span><h4>{r.kind==="orbs"?ORBS.find(o=>o.id===r.orb)?.name:r.name}</h4><p>{r.kind==="nuvo"?"Exclusive mythical companion":r.kind==="cosmetic"?"Exclusive keeper style":`×${r.amount}`}</p><button disabled={!unlocked||claimed} onClick={()=>apply(()=>claimPassReward(save,r.tier))}>{claimed?"✓ Claimed":unlocked?"Claim reward":"Locked"}</button></article>;})}</div>
 <p className="pass-note">Boosts double pass XP only, last 30 real-time minutes, and stack duration. Claimed styles stay yours after the season; equip them at Thread & Thistle. Rewards and progress follow your adventure save.</p>
 </Modal>;
}
